<div align="center">

<img src="https://raw.githubusercontent.com/verticalpartsIA/bd_omie/main/Projeto_BD_Omie_Lovable/src/assets/logo-color.png" alt="VerticalParts Logo" width="200"/>

# VerticalParts Intelligence Platform

**Executive intelligence dashboard for B2B distributors — real-time KPIs, embedded AI CFO, and AI-generated executive reports.**

[![TanStack Start](https://img.shields.io/badge/TanStack_Start-v1-orange?style=flat-square)](https://tanstack.com/start)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F6821F?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Claude AI](https://img.shields.io/badge/Claude_AI-Anthropic-black?style=flat-square)](https://anthropic.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)

</div>

---

## Por que este projeto existe

A **VerticalParts** é uma distribuidora B2B de peças para elevadores e escadas rolantes com 636 clientes ativos, 4.849 pedidos/ano e ticket médio elevado. O negócio cresceu, mas a gestão ainda dependia de planilhas, exportações manuais do ERP e reuniões longas para entender o que estava acontecendo.

Este projeto nasceu para resolver isso: **um painel executivo com dados ao vivo do ERP Omie**, que mostra em segundos o EBITDA, o caixa projetado, os clientes em risco e o que o CEO precisa decidir hoje — sem precisar abrir o ERP, sem esperar relatórios, sem intermediários.

O diferencial é o **CFO embarcado**: ao clicar em "PDF Executivo (IA)", o sistema envia os KPIs do dashboard para o Claude (Anthropic) e recebe em segundos um relatório executivo completo de 12 seções — diagnóstico financeiro, riscos identificados nos dados, oportunidades e plano de ação com horizonte de 90 dias — pronto para apresentar à diretoria.

---

## Screenshots

### Strategic Dashboard — Visão Executiva

![Strategic Dashboard](https://raw.githubusercontent.com/verticalpartsIA/bd_omie/main/docs/images/dashboard.png)

*EBITDA, Resultado Líquido, Caixa D+30/D+90, alertas ao vivo e Forecast de Fechamento*

### Analytical Dashboard — Análise Comercial

![Analytical Dashboard](https://raw.githubusercontent.com/verticalpartsIA/bd_omie/main/docs/images/analytical.png)

*Ticket médio, taxa de recompra, mix por canal, oportunidades detectadas em tempo real*

### Financeiro — Demonstração de Resultados

![Financeiro](https://raw.githubusercontent.com/verticalpartsIA/bd_omie/main/docs/images/financeiro.png)

*DRE simplificada ao vivo, projeções de caixa D+30/D+90, alertas de inadimplência*

### Clientes — Base e Saúde Comercial

![Clientes](https://raw.githubusercontent.com/verticalpartsIA/bd_omie/main/docs/images/clientes.png)

*Segmentação RFM, clientes em risco, concentração de receita, LTV estimado*

---

## Funcionalidades

### Dashboards em tempo real
- **Strategic Dashboard** — EBITDA, resultado líquido, caixa projetado D+30/D+60/D+90, forecast de fechamento, alertas CEO
- **Analytical Dashboard** — pedidos, ticket médio, taxa de recompra, mix por canal de venda, top vendedor
- **Financeiro** — DRE ao vivo, margens, inadimplência, concentração de clientes
- **Estoque** — giro, cobertura de dias, ruptura, SKUs críticos, custo total
- **Clientes** — base ativa, segmentação RFM, clientes em risco, LTV
- **Pedidos** — carteira aberta, histórico, pipeline

### CFO Digital com IA (Claude AI)
- Clique em **"PDF Executivo (IA)"** em qualquer dashboard
- O sistema envia automaticamente todos os KPIs visíveis para o Claude
- Receba em ~20 segundos um relatório executivo com:
  - Resumo executivo + diagnóstico financeiro, operacional e estratégico
  - Riscos identificados nos dados (não genéricos — baseados nos seus números)
  - Oportunidades acionáveis
  - Plano de ação: hoje / esta semana / 30 dias / 90 dias
  - Recomendação final do CFO
- Exporta como PDF brandado com identidade VerticalParts (preto/amarelo)
- Nunca inventa valores: dados ausentes são explicados tecnicamente

### Outras exportações
- **CSV/Excel** em todos os dashboards com um clique

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | TanStack Start (React + TypeScript) |
| Roteamento | TanStack Router (file-based) |
| Backend | Cloudflare Workers (via TanStack Start server routes) |
| Banco de dados | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Claude claude-haiku-4-5-20251001 (Anthropic SDK) |
| PDF | jsPDF v3 (client-side, A4 portrait) |
| ERP | Omie API (sync via Edge Functions + crons) |
| Deploy | Cloudflare Pages + Workers |

---

## Arquitetura do Relatório IA

```
Usuário clica "PDF Executivo (IA)"
        ↓
ExportMenu.tsx — mostra overlay "Gerando relatório..."
        ↓
export-utils.ts — POST /api/ai-report com { KPIs, período, filtros }
        ↓
api/ai-report.ts (Cloudflare Worker)
  → prompt CFO para Claude claude-haiku-4-5-20251001
  → retorna JSON com 12 seções executivas
        ↓
pdf-generator.ts (client-side)
  → cria PDF A4 com identidade VerticalParts
  → download automático
```

O Claude é instruído como CFO embarcado da VerticalParts. Regras anti-alucinação:
- Nunca inventa valores — usa apenas os dados fornecidos
- KPIs ausentes: "Indicador aguardando integração" (nunca zero)
- ROE/ROI/ROA ausentes: explica motivo técnico (patrimônio não integrado)

---

## Estrutura do Projeto

```
Projeto_BD_Omie_Lovable/
├── src/
│   ├── routes/
│   │   ├── api/
│   │   │   └── ai-report.ts        # POST endpoint — chama Claude
│   │   └── _app/
│   │       ├── dashboard.tsx        # Strategic Dashboard
│   │       ├── analytical.tsx       # Analytical Dashboard
│   │       ├── financeiro.tsx       # Financeiro
│   │       ├── estoque.tsx          # Estoque
│   │       ├── clientes/            # Clientes
│   │       └── pedidos.tsx          # Pedidos
│   ├── lib/
│   │   ├── pdf-generator.ts         # Gerador PDF (jsPDF)
│   │   └── export-utils.ts          # Orquestrador: API → PDF
│   ├── components/
│   │   └── app/
│   │       └── ExportMenu.tsx       # Dropdown + overlay de loading
│   └── hooks/                       # Hooks de dados (Supabase)
└── docs/
    ├── ai-pdf-report-architecture.md
    ├── ai-pdf-report-prompts.md
    └── ai-pdf-export-test-report.md
```

---

## Configuração

### Variáveis de ambiente

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Anthropic (para o CFO digital)
ANTHROPIC_API_KEY=sk-ant-...
```

### Instalação

```bash
cd Projeto_BD_Omie_Lovable
npm install
npm run dev
```

### Build para Cloudflare

```bash
npm run build
npx wrangler pages deploy dist
```

---

## Integração com Omie

Os dados chegam do ERP Omie via sincronização automática:

- **Edge Functions** no Supabase fazem chamadas à API Omie
- **pg_cron** executa as syncs periodicamente
- Views materializadas (`vw_ebitda_12m`, `vw_clientes_rfm`, etc.) transformam os dados brutos em KPIs prontos
- O frontend lê apenas das views — zero lógica de negócio no frontend

---

## Documentação

- [Arquitetura do Relatório IA](Projeto_BD_Omie_Lovable/docs/ai-pdf-report-architecture.md)
- [Design dos Prompts do CFO](Projeto_BD_Omie_Lovable/docs/ai-pdf-report-prompts.md)
- [Checklist de Testes](Projeto_BD_Omie_Lovable/docs/ai-pdf-export-test-report.md)

---

<div align="center">

**VerticalParts** — Inteligência executiva embarcada para distribuidoras B2B

*Construído com TanStack Start · Supabase · Cloudflare Workers · Claude AI*

</div>
