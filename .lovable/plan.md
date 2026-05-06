# Plano: VerticalParts mockado

Construir todo o site com UI funcional usando **dados mockados** (arrays/JSON em memória). Sem Supabase por enquanto. Depois eu te entrego os arquivos `.sql` (schema + RLS + seed) para você colar no SQL Editor do projeto `kgecbycsyrtdhmdziuul`.

## Identidade visual (aplicada globalmente)
- Logo "VerticalParts": **VERTICAL** cinza `#808080`, **PARTS** amarelo `#F5C400`, ícone engrenagem + elevador
- Paleta tokens em `src/styles.css` (oklch):
  - primary amarelo `#F5C400`, background preto `#000`, surface branco, neutro cinza `#808080`
- Sidebar dark, cards brancos, acentos amarelos, dark-mode no Dashboard TV
- Tipografia sans-serif bold (Inter / Manrope)

## Arquitetura de rotas (TanStack Start, file-based)

```
src/routes/
├── __root.tsx                  # shell + providers + auth context mock
├── index.tsx                   # Landing (hero, produtos destaque, depoimentos, CTA)
│
├── login.tsx                   # Auth mock (qualquer credencial entra)
├── register.tsx
├── forgot-password.tsx
│
├── _app.tsx                    # Layout autenticado (sidebar + topbar)
├── _app/dashboard.tsx          # KPIs, gráficos
├── _app/dashboard-tv.tsx       # Dashboard operacional dark/TV
│
├── _app/produtos.tsx           # Lista
├── _app/produtos.$id.tsx       # Detalhe
├── _app/categorias.tsx
├── _app/estoque.tsx
├── _app/movimentacoes.tsx
│
├── _app/clientes.tsx
├── _app/clientes.$id.tsx
├── _app/segmentos.tsx
│
├── _app/vendedores.tsx
├── _app/comissoes.tsx
├── _app/metas.tsx
│
├── _app/pedidos.tsx
├── _app/pedidos.$id.tsx
├── _app/faturas.tsx
├── _app/entregas.tsx
│
├── _app/financeiro.contas-pagar.tsx
├── _app/financeiro.contas-receber.tsx
├── _app/financeiro.fluxo-caixa.tsx
│
├── _app/relatorios.vendas.tsx
├── _app/relatorios.rentabilidade.tsx
├── _app/relatorios.estoque.tsx
├── _app/relatorios.curva-abc.tsx
├── _app/relatorios.financeiro.tsx
├── _app/relatorios.custom.tsx
│
└── _app/perfil.tsx             # + sub-rotas security, notifications, preferences
```

## Camada de dados mock
- `src/mocks/` com arrays tipados: `produtos.ts`, `clientes.ts`, `pedidos.ts`, `vendedores.ts`, `financeiro.ts`, etc.
- `src/lib/auth-mock.ts`: contexto de auth fake com roles (`admin`, `gestor`, `vendedor`, `financeiro`, `estoque`, `tv`)
- Hooks `useProdutos()`, `usePedidos()`... retornando promises resolvidas com mocks (fácil trocar por Supabase depois)

## Componentes compartilhados
- `Sidebar` (dark, ícones lucide, agrupada por módulo + RBAC visual)
- `Topbar` (busca, notificações, avatar)
- `KpiCard`, `DataTable` (com filtro/paginação), `StatusBadge`, `Logo`
- Gráficos com `recharts` (linhas, barras, pizza, curva ABC)

## Entregáveis desta fase
1. Design system + Logo + tokens
2. Landing pública + Auth mock
3. Layout autenticado (sidebar/topbar)
4. Todos os módulos com tabelas, formulários e gráficos populados com mock
5. Dashboard TV (rota fullscreen dark)
6. Perfil e preferências

## Próxima fase (após aprovação visual)
Te entrego em `/mnt/documents/`:
- `01_schema.sql` — tabelas + enums + índices
- `02_rls.sql` — políticas + função `has_role`
- `03_seed.sql` — dados iniciais (mesmos dos mocks)
- `04_integration.md` — passo a passo para conectar o frontend ao seu projeto Supabase trocando os hooks mock pelo client real

## Observação técnica
Como é muito conteúdo, vou construir em **iterações**: começo pela base (tokens, logo, landing, auth, layout, sidebar, dashboard) e depois adiciono os módulos em blocos. Após cada bloco você revisa e seguimos.

Confirma que posso começar pela **Iteração 1: base + landing + auth + layout autenticado + dashboard principal**?
