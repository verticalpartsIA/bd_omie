-- ============================================================
-- NF-e Custos & Estoque Fiscal — VerticalParts
-- Aplicar no Supabase SQL Editor
-- Atualizado: 2026-05-15 — inclui estoque_omie, receita_nfe_brl, cmv_brl, lucro_bruto_brl
-- ============================================================

-- 1. Tabela principal de itens de NF-e (entrada + saída)
CREATE TABLE IF NOT EXISTS omie_nfe_itens (
  id              BIGSERIAL PRIMARY KEY,
  numero_nfe      TEXT        NOT NULL,
  numero_omie     BIGINT,
  tipo            CHAR(1)     NOT NULL CHECK (tipo IN ('E', 'S')),
  data_emissao    DATE        NOT NULL,
  codigo_produto  TEXT        NOT NULL,
  descricao       TEXT,
  quantidade      NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_unitario  NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_total     NUMERIC(14,2) NOT NULL DEFAULT 0,
  cnpj_parceiro   TEXT,
  nome_parceiro   TEXT,
  chave_nfe       TEXT,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (numero_nfe, tipo, codigo_produto)
);

CREATE INDEX IF NOT EXISTS idx_nfe_itens_codigo  ON omie_nfe_itens (codigo_produto);
CREATE INDEX IF NOT EXISTS idx_nfe_itens_tipo    ON omie_nfe_itens (tipo);
CREATE INDEX IF NOT EXISTS idx_nfe_itens_data    ON omie_nfe_itens (data_emissao DESC);

ALTER TABLE omie_nfe_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON omie_nfe_itens;
CREATE POLICY "service_role_full" ON omie_nfe_itens
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. Tabela mapa de produtos Omie (ID Omie → código VPEL)
CREATE TABLE IF NOT EXISTS omie_produtos_mapa (
  n_cod_prod   BIGINT PRIMARY KEY,
  codigo       TEXT NOT NULL,
  descricao    TEXT,
  estoque_omie NUMERIC(14,4) DEFAULT 0,
  synced_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_omie_prod_codigo ON omie_produtos_mapa (codigo);

ALTER TABLE omie_produtos_mapa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON omie_produtos_mapa;
CREATE POLICY "service_role_full" ON omie_produtos_mapa
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Controle de sincronização
CREATE TABLE IF NOT EXISTS omie_nfe_sync_state (
  tipo            CHAR(1) PRIMARY KEY CHECK (tipo IN ('E','S')),
  ultima_pagina   INT     DEFAULT 0,
  total_paginas   INT     DEFAULT 0,
  total_registros INT     DEFAULT 0,
  completo        BOOLEAN DEFAULT FALSE,
  ultima_sync     TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO omie_nfe_sync_state (tipo) VALUES ('E'), ('S')
  ON CONFLICT (tipo) DO NOTHING;

-- 4. View: custo médio ponderado por produto (últimas 10 compras NF-e entrada)
CREATE OR REPLACE VIEW vw_custo_medio_produto AS
WITH ranked AS (
  SELECT
    codigo_produto,
    valor_unitario,
    quantidade,
    data_emissao,
    nome_parceiro,
    numero_nfe,
    ROW_NUMBER() OVER (PARTITION BY codigo_produto ORDER BY data_emissao DESC) AS rn
  FROM omie_nfe_itens
  WHERE tipo = 'E' AND valor_unitario > 0 AND quantidade > 0
)
SELECT
  codigo_produto,
  ROUND(SUM(valor_unitario * quantidade) / NULLIF(SUM(quantidade), 0), 4) AS custo_medio,
  ROUND(MIN(valor_unitario), 4)  AS custo_minimo,
  ROUND(MAX(valor_unitario), 4)  AS custo_maximo,
  ROUND(SUM(quantidade), 2)      AS total_comprado,
  COUNT(DISTINCT numero_nfe)     AS qtd_compras,
  MAX(data_emissao)              AS ultima_compra,
  (SELECT nome_parceiro FROM ranked r2
   WHERE r2.codigo_produto = ranked.codigo_produto
     AND r2.rn = 1 LIMIT 1)     AS ultimo_fornecedor
FROM ranked
WHERE rn <= 10
GROUP BY codigo_produto;

-- 5. View: preço médio de venda + receita por produto (NF-e saída)
CREATE OR REPLACE VIEW vw_preco_venda_nfe AS
SELECT
  codigo_produto,
  ROUND(SUM(valor_unitario * quantidade) / NULLIF(SUM(quantidade), 0), 4) AS preco_medio_venda,
  ROUND(SUM(quantidade), 2)      AS total_vendido_nfe,
  ROUND(SUM(valor_total), 2)     AS receita_nfe_brl,
  COUNT(DISTINCT numero_nfe)     AS qtd_nfe_saida,
  MAX(data_emissao)              AS ultima_venda_nfe
FROM omie_nfe_itens
WHERE tipo = 'S' AND valor_unitario > 0 AND quantidade > 0
GROUP BY codigo_produto;

-- 6. View: estoque fiscal (entradas - saídas de NF-e)
CREATE OR REPLACE VIEW vw_estoque_fiscal AS
SELECT
  codigo_produto,
  COALESCE(SUM(CASE WHEN tipo = 'E' THEN quantidade ELSE 0 END), 0)  AS total_entradas,
  COALESCE(SUM(CASE WHEN tipo = 'S' THEN quantidade ELSE 0 END), 0)  AS total_saidas,
  COALESCE(SUM(CASE WHEN tipo = 'E' THEN quantidade ELSE -quantidade END), 0) AS estoque_fiscal
FROM omie_nfe_itens
GROUP BY codigo_produto;

-- 7. View consolidada: custo + venda + margem + estoque Omie por produto
--    Inclui: receita_nfe_brl, cmv_brl, lucro_bruto_brl, estoque_omie
DROP VIEW IF EXISTS vw_produto_fiscal;
CREATE VIEW vw_produto_fiscal AS
SELECT
  c.codigo_produto,
  c.custo_medio,
  c.custo_minimo,
  c.custo_maximo,
  c.total_comprado,
  c.qtd_compras,
  c.ultima_compra,
  c.ultimo_fornecedor,
  v.preco_medio_venda,
  v.total_vendido_nfe,
  v.receita_nfe_brl,
  -- CMV = custo_medio × total_vendido_nfe
  CASE
    WHEN c.custo_medio > 0 AND v.total_vendido_nfe > 0
    THEN ROUND(c.custo_medio * v.total_vendido_nfe, 2)
    ELSE NULL
  END AS cmv_brl,
  -- Lucro Bruto = receita_nfe_brl - cmv_brl
  CASE
    WHEN c.custo_medio > 0 AND v.total_vendido_nfe > 0 AND v.receita_nfe_brl > 0
    THEN ROUND(v.receita_nfe_brl - (c.custo_medio * v.total_vendido_nfe), 2)
    ELSE NULL
  END AS lucro_bruto_brl,
  -- Margem real = (preço_venda - custo) / preço_venda × 100
  CASE
    WHEN c.custo_medio > 0 AND v.preco_medio_venda > 0
    THEN ROUND((v.preco_medio_venda - c.custo_medio) / v.preco_medio_venda * 100, 2)
    ELSE NULL
  END AS margem_real_pct,
  -- Estoque real do Omie (do catálogo de produtos)
  COALESCE(pm.estoque_omie, 0) AS estoque_omie
FROM vw_custo_medio_produto c
LEFT JOIN vw_preco_venda_nfe  v  ON v.codigo_produto = c.codigo_produto
LEFT JOIN omie_produtos_mapa  pm ON pm.codigo = c.codigo_produto;

COMMENT ON VIEW vw_produto_fiscal IS
  'Custo médio (NF-e entrada), preço venda (NF-e saída), margem real, CMV, lucro bruto e estoque Omie por produto VPEL.';
