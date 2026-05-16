import { createFileRoute } from "@tanstack/react-router";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getEnv(key: string): string {
  // @ts-expect-error Cloudflare Workers global
  if (typeof globalThis[key] !== "undefined") return globalThis[key] as string;
  return (process.env[key] as string) ?? "";
}

async function sbQuery(table: string, params: Record<string, string>): Promise<unknown[]> {
  const url = new URL(`${getEnv("VITE_SUPABASE_URL")}/rest/v1/${encodeURIComponent(table)}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: {
      apikey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
      Authorization: `Bearer ${getEnv("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    if (text.includes("does not exist") || res.status === 404) return [];
    throw new Error(`sb:${table} ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<unknown[]>;
}

async function sbUpsert(table: string, rows: unknown[], onConflict?: string): Promise<void> {
  if (!rows.length) return;
  const qs = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : "";
  const url = `${getEnv("VITE_SUPABASE_URL")}/rest/v1/${encodeURIComponent(table)}${qs}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
      Authorization: `Bearer ${getEnv("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`sb:upsert:${table} ${res.status} ${(await res.text()).slice(0, 200)}`);
}

async function sbDelete(table: string, filters: Record<string, string>): Promise<void> {
  const url = new URL(`${getEnv("VITE_SUPABASE_URL")}/rest/v1/${encodeURIComponent(table)}`);
  for (const [k, v] of Object.entries(filters)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      apikey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
      Authorization: `Bearer ${getEnv("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`sb:delete:${table} ${res.status} ${(await res.text()).slice(0, 200)}`);
}

async function omieCall(endpoint: string, call: string, params: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`https://app.omie.com.br/api/v1/${endpoint}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      call,
      app_key: getEnv("OMIE_APP_KEY"),
      app_secret: getEnv("OMIE_APP_SECRET"),
      param: [params],
    }),
  });
  // Omie retorna erros como JSON mesmo em status não-2xx (ex: 425 rate limit)
  const json = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (json.faultstring) throw new Error(`omie:${endpoint}:${call} fault: ${json.faultstring}`);
  if (!res.ok) throw new Error(`omie:${endpoint}:${call} HTTP ${res.status}`);
  return json;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NfeItemProduto {
  codigo: string;
  custoMedio: number;
  custoMinimo: number;
  custoMaximo: number;
  precoMedioVenda: number;
  margemRealPct: number | null;
  estoqueOmie: number;    // estoque real do Omie (omie_produtos_mapa.estoque_omie)
  totalComprado: number;
  totalVendidoNfe: number;
  qtdCompras: number;
  ultimaCompra: string | null;
  ultimoFornecedor: string | null;
  receitaNfeBrl: number;
  cmvBrl: number | null;
  lucroBrutoBrl: number | null;
}

export interface NfeSyncStatus {
  totalEntradas: number;
  totalSaidas: number;
  syncedAt: string;
  tabelaExiste: boolean;
}

export interface NfeResponse {
  custos: NfeItemProduto[];
  status: NfeSyncStatus;
}

// ── Omie NF-e sync helpers ────────────────────────────────────────────────────

interface OmieNfeItem {
  numero_nfe: string;
  numero_omie: number;
  tipo: "E" | "S";
  data_emissao: string;
  codigo_produto: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  cnpj_parceiro: string;
  nome_parceiro: string;
  chave_nfe: string;
}

/**
 * Sincroniza catálogo de produtos Omie → omie_produtos_mapa(n_cod_prod, codigo)
 * Permite mapear cProd de NF-e entrada (cód. fornecedor) → código VPEL interno.
 * Endpoint: produtos/produto | call: ListarProdutos
 */
/**
 * Carrega o mapa de produtos (nCodProd → código VPEL).
 * - forceRefresh=false (padrão): usa apenas o cache do Supabase (rápido, zero calls Omie)
 * - forceRefresh=true: re-sincroniza com Omie (usa ?syncCatalog=1 ou primeira execução)
 */
async function syncCatalogoProdutos(forceRefresh = false): Promise<Map<number, string>> {
  const mapa = new Map<number, string>();

  // Sempre carrega o cache do Supabase primeiro
  const cached = await sbQuery("omie_produtos_mapa", { select: "n_cod_prod,codigo", limit: "10000" }).catch(() => []);
  for (const p of cached as any[]) mapa.set(Number(p.n_cod_prod), String(p.codigo));

  // Se já tem dados no cache e não forçou refresh → retorna imediatamente (sem calls Omie)
  if (mapa.size >= 10 && !forceRefresh) return mapa;

  // Primeira execução ou forceRefresh: sincroniza catálogo do Omie
  // Endpoint correto: geral/produtos | call: ListarProdutos
  // Campos de retorno: codigo_produto (ID Omie), codigo (código VPEL), descricao
  const CATALOG_MAX_PAGES = 150; // 150 × 50 = 7.500 produtos máx (>6900 existentes)
  for (let pagina = 1; pagina <= CATALOG_MAX_PAGES; pagina++) {
    // Delay anti-rate-limit do Omie (exceto 1ª página)
    if (pagina > 1) await new Promise(r => setTimeout(r, 250));

    let resp: Record<string, unknown>;
    try {
      resp = await omieCall("geral/produtos", "ListarProdutos", {
        pagina,
        registros_por_pagina: 50,
      }) as Record<string, unknown>;
    } catch (e) {
      if (pagina === 1) throw e;
      break;
    }

    const lista = (resp.produto_servico_listagem ?? resp.produto_servico_cadastro ?? []) as unknown[];
    if (!lista.length) break;

    const rows: Array<{ n_cod_prod: number; codigo: string; descricao: string; estoque_omie: number }> = [];
    for (const item of lista) {
      const p = item as Record<string, unknown>;
      // Omie geral/produtos: codigo_produto = ID numérico Omie, codigo = código VPEL
      const nCodProd = Number(p.nCodProd ?? p.codigo_produto ?? 0);
      const codigo = String(p.cCodigo ?? p.codigo ?? "").trim();
      if (!nCodProd || !codigo) continue;
      mapa.set(nCodProd, codigo);
      rows.push({
        n_cod_prod: nCodProd,
        codigo,
        descricao: String(p.cDescricao ?? p.descricao ?? "").slice(0, 200),
        estoque_omie: Number(p.quantidade_estoque ?? 0),
      });
    }
    if (rows.length) await sbUpsert("omie_produtos_mapa", rows, "n_cod_prod");

    // Usa total_de_paginas da resposta, mas nunca ultrapassa CATALOG_MAX_PAGES
    const totalPagsOmie = Number(resp.total_de_paginas ?? resp.nTotPaginas ?? 1);
    const totalPags = Math.min(totalPagsOmie, CATALOG_MAX_PAGES);
    if (pagina >= totalPags) break;
  }

  return mapa;
}

/**
 * Endpoint: produtos/nfconsultar | call: ListarNF
 * Documentação: https://app.omie.com.br/api/v1/produtos/nfconsultar/
 *
 * Estrutura da resposta:
 *   { pagina, total_de_paginas, registros, total_de_registros, nfCadastro: [...] }
 *
 * Cada item em nfCadastro:
 *   ide        → nNF, dEmi, tpNF ("0"=entrada, "1"=saída), cChaveNFe (via compl)
 *   nfDestInt  → cRazao, cnpj_cpf   (destinatário; para saída = cliente)
 *   compl      → nIdNF, cChaveNFe
 *   det[]      → prod: { cProd, xProd, qCom, vUnCom, vProd }
 */
function parseNfeDet(det: unknown[], tipo: "E" | "S", meta: {
  numero_nfe: string;
  numero_omie: number;
  data_emissao: string;
  cnpj_parceiro: string;
  nome_parceiro: string;
  chave_nfe: string;
}, produtosMapa?: Map<number, string>): OmieNfeItem[] {
  return det.flatMap((d: unknown) => {
    const item = d as Record<string, unknown>;
    const prod = (item.prod ?? {}) as Record<string, unknown>;
    // For entrada (purchases), try to resolve via Omie product ID → VPEL code
    let codigo: string;
    if (tipo === "E" && produtosMapa) {
      const nfProdInt = (item.nfProdInt ?? {}) as Record<string, unknown>;
      const nCodProd = Number(nfProdInt.nCodProd ?? 0);
      const vpelCode = nCodProd > 0 ? produtosMapa.get(nCodProd) : undefined;
      codigo = vpelCode ?? String(prod.cProd ?? "").trim();
    } else {
      codigo = String(prod.cProd ?? "").trim();
    }
    if (!codigo) return [];
    const qtd = Number(prod.qCom ?? 0);
    const vUnit = Number(prod.vUnCom ?? 0);
    const vProd = Number(prod.vProd ?? qtd * vUnit);
    if (qtd <= 0) return [];
    return [{
      ...meta,
      tipo,
      codigo_produto: codigo,
      descricao: String(prod.xProd ?? "").trim().slice(0, 200),
      quantidade: qtd,
      valor_unitario: vUnit,
      valor_total: vProd,
    }];
  });
}

async function syncNfeTipo(tipo: "E" | "S", maxPaginas = 20, produtosMapa?: Map<number, string>): Promise<number> {
  const endpoint = "produtos/nfconsultar";
  const call = "ListarNF";
  const tpNF = tipo === "E" ? "0" : "1"; // 0=entrada(compra), 1=saída(venda)
  let total = 0;

  // Para entrada: limpa registros antigos com códigos de fornecedor e re-sincroniza com VPEL
  if (tipo === "E" && produtosMapa && produtosMapa.size > 0) {
    await sbDelete("omie_nfe_itens", { tipo: "eq.E" }).catch(() => {/* ignore if empty */});
  }

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    let resp: Record<string, unknown>;
    try {
      resp = await omieCall(endpoint, call, {
        pagina,
        registros_por_pagina: 50,
        tpNF,
      }) as Record<string, unknown>;
    } catch (e) {
      // Propaga erro da primeira página para visibilidade
      if (pagina === 1) throw e;
      break;
    }

    const lista = (resp.nfCadastro ?? []) as unknown[];
    if (!lista.length) break;

    const rows: OmieNfeItem[] = [];
    for (const nfe of lista) {
      const n = nfe as Record<string, unknown>;
      const ide     = (n.ide      ?? {}) as Record<string, unknown>;
      const compl   = (n.compl    ?? {}) as Record<string, unknown>;
      const nfDest  = (n.nfDestInt ?? {}) as Record<string, unknown>;
      const det: unknown[] = Array.isArray(n.det) ? n.det : [];

      // dEmi vem no formato DD/MM/AAAA — converte para AAAA-MM-DD
      const dEmiRaw = String(ide.dEmi ?? "").trim();
      let dataRaw = "";
      if (dEmiRaw.includes("/")) {
        const [d, m, a] = dEmiRaw.split("/");
        dataRaw = `${a}-${m}-${d}`;
      } else {
        dataRaw = dEmiRaw.slice(0, 10);
      }
      if (!dataRaw || dataRaw === "--") continue;

      // Para saída (nós emitimos): parceiro = destinatário (cliente)
      // Para entrada (recebemos): nfDestInt seria nós mesmos — deixa em branco por ora
      const parceiroNome = tipo === "S" ? String(nfDest.cRazao ?? "") : "";
      const parceiroCNPJ = tipo === "S" ? String(nfDest.cnpj_cpf ?? "") : "";

      const meta = {
        numero_nfe: String(ide.nNF ?? ""),
        numero_omie: Number(compl.nIdNF ?? 0),
        data_emissao: dataRaw,
        cnpj_parceiro: parceiroCNPJ,
        nome_parceiro: parceiroNome.slice(0, 100),
        chave_nfe: String(compl.cChaveNFe ?? ""),
      };

      if (!meta.numero_nfe) continue;
      rows.push(...parseNfeDet(det, tipo, meta, produtosMapa));
    }

    if (rows.length) {
      // Deduplica dentro do batch: mesmo (numero_nfe, tipo, codigo_produto) → soma qtd/valor
      const deduped = new Map<string, OmieNfeItem>();
      for (const r of rows) {
        const key = `${r.numero_nfe}|${r.tipo}|${r.codigo_produto}`;
        const ex = deduped.get(key);
        if (ex) {
          ex.quantidade += r.quantidade;
          ex.valor_total += r.valor_total;
          ex.valor_unitario = ex.quantidade > 0 ? ex.valor_total / ex.quantidade : ex.valor_unitario;
        } else {
          deduped.set(key, { ...r });
        }
      }
      const deduplicatedRows = Array.from(deduped.values());
      await sbUpsert("omie_nfe_itens", deduplicatedRows, "numero_nfe,tipo,codigo_produto");
      total += deduplicatedRows.length;
    }

    const totalPags = Number(resp.total_de_paginas ?? 1);
    if (pagina >= totalPags) break;
  }

  return total;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/nfe")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const sync       = url.searchParams.get("sync")  === "1";
          const debugParam = url.searchParams.get("debug");
          const debug      = debugParam !== null; // ?debug=1 ou ?debug=entrada

          // Debug: inspeciona estrutura real do Omie sem salvar
          // ?debug=1 → saída (tpNF=1) | ?debug=entrada → entrada (tpNF=0)
          if (debug) {
            const tpDebug = url.searchParams.get("debug") === "entrada" ? "0" : "1";
            const sample = await omieCall("produtos/nfconsultar", "ListarNF", {
              pagina: 1, registros_por_pagina: 2, tpNF: tpDebug,
            }).catch((e: unknown) => ({ erro: String(e) })) as Record<string, unknown>;

            if (sample.erro) return Response.json({ erro: sample.erro });

            const lista = (sample.nfCadastro ?? []) as unknown[];
            const first = lista[0] as Record<string, unknown> | undefined;
            const firstDet0 = Array.isArray(first?.det) && first.det[0]
              ? first.det[0] as Record<string, unknown> : undefined;
            const firstProd = (firstDet0?.prod ?? {}) as Record<string, unknown>;

            return Response.json({
              tpNF: tpDebug === "0" ? "entrada (compra)" : "saída (venda)",
              totalRegs: sample.total_de_registros,
              totalPags: sample.total_de_paginas,
              qtdRetornada: lista.length,
              // Chaves de cada sub-objeto para diagnóstico
              chavesItem: first ? Object.keys(first) : [],
              chavesIde: first?.ide ? Object.keys(first.ide as object) : [],
              chavesCompl: first?.compl ? Object.keys(first.compl as object) : [],
              chavesNfDest: first?.nfDestInt ? Object.keys(first.nfDestInt as object) : [],
              chavesDetItem: firstDet0 ? Object.keys(firstDet0) : [],
              chavesProd: Object.keys(firstProd),
              // Valores relevantes do primeiro det item
              primeiroDetProd: firstProd,
              // Objeto completo para inspeção manual
              primeiroItem: first,
            });
          }

          // ── Debug produtos: inspeciona resposta real do catálogo Omie ─────────
          // ?debugProdutos=1 → testa geral/produtos:ListarProdutos (1 reg)
          const debugProdutos = url.searchParams.get("debugProdutos") === "1";
          if (debugProdutos) {
            const sample = await omieCall("geral/produtos", "ListarProdutos", {
              pagina: 1, registros_por_pagina: 50,
            }).catch((e: unknown) => ({ erro: String(e) })) as Record<string, unknown>;
            if (sample.erro) return Response.json({ erro: sample.erro });
            const lista = (sample.produto_servico_listagem ?? sample.produto_servico_cadastro ?? []) as unknown[];
            const first = lista[0] as Record<string, unknown> | undefined;
            return Response.json({
              endpoint: "geral/produtos",
              call: "ListarProdutos",
              totalRegs: sample.total_de_registros,
              totalPags: sample.total_de_paginas,
              qtdRetornada: lista.length,
              chavesItem: first ? Object.keys(first) : [],
              primeiroItem: first,
            });
          }

          // ── Modos de sync ──────────────────────────────────────────────────────
          // ?sync=1            → sync rápido (20 pág. cada, cache catálogo)
          // ?sync=1&full=1     → sync completo (200 pág., sem limite)
          // ?syncCatalog=1     → só atualiza catálogo de produtos (sem NF-e)
          const syncCatalog = url.searchParams.get("syncCatalog") === "1";
          const fullSync    = url.searchParams.get("full") === "1";
          const maxPags     = fullSync ? 200 : 20;

          let syncMsg = "";
          let syncDebug = "";

          // Sync só do catálogo — roda em background, retorna imediatamente
          // (138 páginas × ~750ms = ~100s, não pode bloquear o browser)
          if (syncCatalog) {
            // Fire-and-forget: não aguarda conclusão
            syncCatalogoProdutos(true)
              .then((m) => console.log(`[catalog] concluído: ${m.size} produtos`))
              .catch((e) => console.error(`[catalog] erro:`, e));
            syncMsg = "Sincronização do catálogo iniciada em background (~2min). Consulte omie_produtos_mapa no Supabase para acompanhar.";
          }

          // Sync NF-e (rápido ou completo)
          if (sync) {
            let neErr = "", nsErr = "", ncErr = "";
            // Catálogo: usa cache (rápido). Force refresh apenas em fullSync
            const mapa = await syncCatalogoProdutos(fullSync).catch((e) => { ncErr = String(e); return new Map<number, string>(); });
            const ne = await syncNfeTipo("E", maxPags, mapa).catch((e) => { neErr = String(e); return 0; });
            const ns = await syncNfeTipo("S", maxPags).catch((e) => { nsErr = String(e); return 0; });
            syncMsg = `Sincronizados: ${ne} itens entrada, ${ns} itens saída${fullSync ? " (full)" : ""}`;
            if (ncErr || neErr || nsErr) syncDebug = `Cat:${ncErr||"ok"} | E:${neErr||"ok"} | S:${nsErr||"ok"}`;
          }

          // Read from consolidated view
          const [custosRaw, statusRaw] = await Promise.all([
            sbQuery("vw_produto_fiscal", {
              select: "codigo_produto,custo_medio,custo_minimo,custo_maximo,preco_medio_venda,margem_real_pct,estoque_omie,total_comprado,total_vendido_nfe,qtd_compras,ultima_compra,ultimo_fornecedor,receita_nfe_brl,cmv_brl,lucro_bruto_brl",
              limit: "5000",
            }).catch(() => []),
            sbQuery("omie_nfe_itens", { select: "tipo", limit: "1" }).catch(() => null),
          ]);

          const tabelaExiste = statusRaw !== null;

          const [contEntradas, contSaidas] = await Promise.all([
            sbQuery("omie_nfe_itens", { select: "tipo", tipo: "eq.E", limit: "1" }).catch(() => []),
            sbQuery("omie_nfe_itens", { select: "tipo", tipo: "eq.S", limit: "1" }).catch(() => []),
          ]);

          const custos: NfeItemProduto[] = (custosRaw as any[]).map((r) => ({
            codigo: String(r.codigo_produto ?? ""),
            custoMedio: Number(r.custo_medio ?? 0),
            custoMinimo: Number(r.custo_minimo ?? 0),
            custoMaximo: Number(r.custo_maximo ?? 0),
            precoMedioVenda: Number(r.preco_medio_venda ?? 0),
            margemRealPct: r.margem_real_pct != null ? Number(r.margem_real_pct) : null,
            estoqueOmie: Number(r.estoque_omie ?? 0),
            totalComprado: Number(r.total_comprado ?? 0),
            totalVendidoNfe: Number(r.total_vendido_nfe ?? 0),
            qtdCompras: Number(r.qtd_compras ?? 0),
            ultimaCompra: r.ultima_compra ? String(r.ultima_compra) : null,
            ultimoFornecedor: r.ultimo_fornecedor ? String(r.ultimo_fornecedor) : null,
            receitaNfeBrl: Number(r.receita_nfe_brl ?? 0),
            cmvBrl: r.cmv_brl != null ? Number(r.cmv_brl) : null,
            lucroBrutoBrl: r.lucro_bruto_brl != null ? Number(r.lucro_bruto_brl) : null,
          }));

          const response: NfeResponse & { syncMsg?: string } = {
            custos,
            status: {
              totalEntradas: contEntradas.length,
              totalSaidas: contSaidas.length,
              syncedAt: new Date().toISOString(),
              tabelaExiste,
            },
            ...(syncMsg ? { syncMsg } : {}),
            ...(syncDebug ? { syncDebug } : {}),
          };

          return Response.json(response);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/nfe]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
