# Plano de Evolução — VerticalParts v2.1

Escopo grande (14 telas). Vou executar em **4 ondas** seguindo a prioridade do SDD, com checkpoints entre elas para você validar antes de seguir. Tudo mantém identidade visual (preto/branco/amarelo), sidebar, títulos e KPIs atuais — apenas adiciono camadas de decisão.

## Fundação compartilhada (antes da Onda 1)

Componentes/utilitários reutilizáveis para evitar retrabalho:

- `GlobalFilters` — barra de filtros padronizada (período, categoria, cliente, vendedor, status, segmento, canal, região, unidade) por tela, via search params (TanStack zodValidator).
- `ExportMenu` — botão CSV/Excel/PDF (CSV/Excel via blob no client; PDF via `window.print` estilizado).
- `AlertasRecomendacoes` — bloco padrão "Alertas e Recomendações" recebendo lista tipada (crítico/atenção/info + ação sugerida).
- `KpiCard` extensão: variante com delta vs meta + drilldown onClick.
- `mock-engine`: helpers para EBITDA, churn, OTIF, aging, forecast, cohort — derivados dos mocks existentes (sem quebrar dados atuais).

## Onda 1 — Diretoria (Prioridade 1)

1. **Strategic Dashboard**: cards EBITDA, Resultado Líquido, Receita Recorrente/Não Recorrente, Caixa 30/60/90; bloco "Atenção do CEO hoje" (agrega sinais de churn, ruptura, SLA, margem, vendedor); gráfico Receita×Margem×EBITDA 12m; Concentração Top 5/10; filtros globais; drilldown nos KPIs.
2. **Finance**: cards EBITDA, Margem EBITDA, Resultado Líquido, Margem Líquida, Capital de Giro; simulação 3 cenários (conservador/provável/agressivo); alertas (caixa mínimo, inadimplência, margem negativa); DRE filtrável; Receita recorrente×não recorrente; ranking clientes mais/menos rentáveis.
3. **Operational Dashboard**: corrigir sobreposição de cards; modo TV fullscreen; alternância de visões (Geral/Comercial/Estoque/Financeiro/Logística); ticker superior de alertas; níveis Crítico/Atenção/Info; bloco "Próxima ação"; auto-refresh 30s/1min/5min/manual; layout 16:9.
4. **Orders**: cards OTIF e Pedidos Críticos; colunas Prioridade, Motivo do atraso, Transportadora; gráfico SLA por etapa; rankings de clientes com mais atrasos e motivos; alertas (>48h, VIP atrasado, faturado sem coleta, fatura vencida); drilldown do pedido.

## Onda 2 — Receita e Cliente (Prioridade 2)

5. **Analytical Dashboard**: filtro de comparação (mês/tri/ano vs anterior); card Forecast; seção Oportunidades; cohort de clientes; margem por vendedor; drilldown Top Clientes/Produtos.
6. **Customers**: cards Churn Rate e Risco Alto; colunas margem/LTV/risco/upsell/último contato; tela detalhe `/clientes/:id` enriquecida (histórico, produtos, margem, inadimplência, SLA, recomendações); bloco "Clientes que exigem ação hoje".
7. **Segmentação RFM**: coluna Ação Recomendada; botão Criar Campanha; playbooks por segmento; métrica Receita Recuperável Estimada; filtro por vendedor responsável.
8. **Sellers**: cards Margem média e Desconto médio; tabela com lucro estimado, CAC, conversão; ranking alternável (receita/margem/conversão/ticket/comissão); pipeline por etapa×vendedor; bloco "Vendedores que precisam de atenção".

## Onda 3 — Estoque e Operação (Prioridade 3)

9. **Estoque**: seção Aging (0-30/31-90/91-180/181-365/365+); cards Capital Parado e Compra Sugerida; tabela Recomendação de Reposição com impacto no caixa; alerta Ruptura Prevista.
10. **Produtos**: colunas custo/preço/margem/giro/lead time/fornecedor/min/max/previsão de ruptura; botão "Novo Produto" funcional; detalhe enriquecido com substitutos e recomendação de compra; destaques visuais.
11. **Categorias**: gráfico Giro×Margem (quadrante); rankings; status saudável/atenção/crítico; bloco "Categoria que exige ação"; clique no card filtra Produtos/Estoque.
12. **Movimentações**: filtros expandidos; colunas responsável/cliente/pedido/OS/NF/lote; alertas anomalia; exportar auditoria; card Ajustes Manuais.

## Onda 4 — Administração (Prioridade 4)

13. **Reports**: Report Builder real (dimensão×métrica×agrupamento); salvar/agendar; export Excel/PDF; relatórios prontos catalogados; respeito a permissões.
14. **Settings** (nova tela completa): 9 seções (Perfil, Empresa, Usuários/Permissões com 8 perfis, Integrações com slots Omie/Supabase/WhatsApp/Power BI/Sheets/API, Alertas configuráveis, Metas, Parâmetros estoque/financeiro, Auditoria com log).

## Detalhes técnicos

- **Stack**: TanStack Start + Router (file-based em `src/routes/_app/`), Recharts, shadcn/ui, Tailwind tokens em `src/styles.css`.
- **Filtros globais**: `validateSearch` com `zodValidator` + `fallback`; URL como state para deep-linking; `retainSearchParams` para não perder filtros entre telas.
- **Export**: CSV nativo (Blob+`URL.createObjectURL`), Excel via `xlsx` (instalar), PDF via `window.print` com `@media print` ou `jspdf`+`html2canvas` se necessário.
- **Permissões**: reaproveitar `RoleGuard` + `auth-mock`; adicionar perfis novos no enum.
- **Backend-ready**: cada tela consome dados via funções puras em `src/data/*-mock.ts` com assinatura compatível com futura migração para `createServerFn` (ex.: `getStrategicKpis(filters)`); nenhum mock será removido, apenas envelopado.
- **Sem quebras**: KPIs e gráficos atuais permanecem; novidades são acrescentadas em blocos superiores ou seções novas.

## Entregáveis por onda

Ao final de cada onda eu paro, listo arquivos alterados/criados e peço seu OK antes de iniciar a próxima. Isso evita que mudanças grandes acumulem sem revisão.

## Confirmação que preciso

1. Posso começar pela **Onda 1 (Diretoria)** agora?
2. Para PDF de exportação, prefere `window.print` (zero dependência, suficiente) ou biblioteca dedicada (`jspdf`)?
3. "Backend real" entra como Onda 5 separada (ativar Lovable Cloud, migrar mocks para tabelas, RLS, auditoria real) — confirma esse adiamento?
