# Claude Design Instructions - VerticalParts Auth

Use este arquivo como briefing para desenhar ou refinar telas de autenticação no projeto VerticalParts.

## Projeto

Projeto principal:

`C:\Users\gelso\Projetos_Sites\bd_Omie\Projeto_BD_Omie_Lovable`

Referência visual/design system:

`C:\Users\gelso\Projetos_Sites\bd_Omie\vpdashboarDesignv1\preview`

Arquivos úteis de referência:

- `src/styles.css`
- `src/components/auth/SplitShell.tsx`
- `src/components/auth/CenteredShell.tsx`
- `src/components/auth/Field.tsx`
- `src/components/brand/Logo.tsx`
- `src/assets/vp-mark.png`
- `vpdashboarDesignv1/colors_and_type.css`
- `vpdashboarDesignv1/preview/colors-primary.html`
- `vpdashboarDesignv1/preview/colors-neutrals.html`
- `vpdashboarDesignv1/preview/buttons.html`
- `vpdashboarDesignv1/preview/inputs.html`
- `vpdashboarDesignv1/preview/cards.html`
- `vpdashboarDesignv1/preview/logo-lockup.html`

## Stack

- React 19
- Vite
- TanStack Router
- Tailwind CSS 4
- Radix UI
- shadcn-style components
- lucide-react icons
- Supabase Auth

Use os componentes e padrões existentes. Não criar HTML solto dentro do app.

## Identidade Visual

VerticalParts deve parecer industrial, técnico, moderno e confiável.

Palavras-chave:

- industrial
- engenharia
- precisão
- estoque técnico
- peças para elevadores, escadas e esteiras rolantes
- sistema interno profissional

Evitar aparência de landing page genérica, SaaS roxo/azulado, fintech, app casual ou tela decorativa demais.

## Cores

Paleta principal:

- Amarelo VerticalParts: `#F5C400`
- Amarelo hover: `#FFD400`
- Amarelo pressionado: `#C99E00`
- Preto: `#000000`
- Ink: `#0A0A0A`
- Graphite: `#1A1A1A`
- Steel: `#2A2A2A`
- Cinza marca: `#808080`
- Cinza texto: `#4A4A4A`
- Cinza borda: `#E5E5E5`
- Fundo claro: `#FFFFFF`
- Fundo sutil: `#F9F9F9`

Status:

- Sucesso: `#2E7D32`
- Info: `#1565C0`
- Aviso: `#ED8C00`
- Erro: `#C62828`

No projeto atual, as cores estão em `src/styles.css` usando `oklch`. Preserve essa estrutura.

Mapeamento existente:

- `--primary`: amarelo VerticalParts
- `--primary-foreground`: preto
- `--sidebar`: preto/grafite industrial
- `--background`: branco
- `--foreground`: preto quase puro
- `--brand-yellow`: `#f5c400`
- `--brand-gray`: `#808080`
- `--brand-black`: `#000000`

## Tipografia

O preview usa:

- Display/sans: `Red Hat Display`
- Mono: `JetBrains Mono`

O app atual usa:

- `Poppins`, system-ui, sans-serif

Para tela de autenticação, manter a fonte do app salvo se houver decisão explícita de trocar no sistema inteiro. Não misturar muitas fontes.

Estilo tipográfico:

- títulos fortes, uppercase ou semi-uppercase quando fizer sentido
- labels pequenos em uppercase com espaçamento amplo
- texto de apoio limpo e direto
- códigos, SKUs e dados técnicos podem usar fonte mono se necessário

## Layout de Autenticação

Existem dois shells:

1. `SplitShell`
   - Tela dividida.
   - Lado esquerdo escuro com marca, proposta de valor e bullets.
   - Lado direito branco com formulário.
   - Use para login/cadastro principal.

2. `CenteredShell`
   - Card central sobre fundo escuro radial.
   - Use para recuperação de senha, confirmação de email, convite ou estados simples.

Preferência para login principal:

- Usar `SplitShell`.
- Lado escuro deve ocupar a área institucional.
- Formulário deve ser claro, limpo e focado.

## Fundo

O fundo escuro atual usa:

- radial gradient em preto/grafite
- grid técnico sutil em amarelo com baixa opacidade
- marca/logo VerticalParts

Manter essa linguagem.

Não usar:

- blobs decorativos
- gradiente roxo/azul
- ilustrações genéricas
- card dentro de card
- excesso de vidro/blur
- background fotográfico genérico

## Logo

Usar componente:

`src/components/brand/Logo.tsx`

Comportamento:

- Em fundo escuro: `invert`
- Em fundo claro: normal
- `Vertical` em cinza/branco conforme contexto
- `Parts` em amarelo `#F5C400`

Não redesenhar o logo manualmente.

## Formulários

Usar ou seguir:

`src/components/auth/Field.tsx`

Padrão visual:

- label em uppercase, 11px, bold, tracking amplo
- input branco
- borda neutra
- foco com borda amarela e ring amarelo suave
- erro em vermelho `#C62828`
- sucesso em verde
- cantos discretos, não muito arredondados

Campos comuns:

- Email
- Senha
- Confirmar senha quando necessário
- Nome quando necessário
- Empresa/equipe somente se fizer parte do fluxo

Senha:

- Usar botão de mostrar/ocultar com ícones `Eye` e `EyeOff` do lucide-react.
- Botão deve ter `aria-label`.

## Botões

Base visual do preview:

- botão primário amarelo `#F5C400`
- texto preto
- uppercase
- bold/extrabold
- tracking moderado
- bordas retas ou raio pequeno
- hover `#FFD400`
- sombra amarela apenas quando fizer sentido

Botão primário:

- Entrar
- Criar conta
- Enviar link

Botão secundário:

- fundo preto, texto branco
- ou outline preto em fundo claro

Evitar botões arredondados demais.

## Conteúdo da Tela de Login

Tom do texto:

- profissional
- direto
- orientado a operação
- sem marketing excessivo

Exemplo de lado institucional:

Eyebrow:

`VerticalParts Intelligence`

Título:

`Gestão técnica para estoque, demanda e produtos Omie`

Descrição:

`Acesse indicadores, análises de giro, produtos zerados e recomendações de cadastro com foco operacional e fiscal.`

Bullets:

- `Produtos, SKUs e NCMs em uma visão auditável`
- `Análises de estoque, giro e ruptura`
- `Base preparada para Omie, Catálogo de Produtos e DUIMP`

Rodapé:

`© 2026 VerticalParts · Plataforma interna`

## Estados Obrigatórios

Toda tela de autenticação deve prever:

- loading ao submeter
- erro de credencial
- erro de validação de email
- senha obrigatória
- link "esqueci minha senha"
- alternância entre login e cadastro quando existir
- feedback de email enviado para reset
- estado bloqueado/desabilitado durante requisição

## Acessibilidade

Obrigatório:

- labels associados aos inputs
- contraste alto
- foco visível
- botões com texto claro
- ícones com `aria-label` quando forem interativos
- não depender apenas de cor para erro
- mensagens de erro próximas ao campo

## Responsividade

Desktop:

- Split layout em duas colunas.
- Lado institucional escuro à esquerda.
- Formulário branco à direita.

Mobile:

- Coluna única.
- Priorizar formulário.
- Logo visível.
- Texto institucional reduzido.
- Não deixar o formulário espremido.
- Padding mínimo de 24px.

## Componentes Existentes a Respeitar

Autenticação:

- `SplitShell`
- `CenteredShell`
- `Field`
- `FormHead`
- `AuthSwitcher`

UI:

- `Button`
- `Input`
- `Card`
- `Label`
- `Alert`
- `Separator`

Marca:

- `Logo`

## O Que Não Fazer

Não:

- criar uma landing page no lugar da tela de login
- usar paleta roxa/azul dominante
- usar cards aninhados
- usar cantos muito arredondados
- inserir texto explicando como usar a interface
- usar imagem externa aleatória
- criar logo alternativo
- usar "KIT" ou conteúdo fiscal nas telas de autenticação
- alterar fluxo de autenticação sem entender Supabase/Auth atual

## Entregável Esperado do Claude Design

Quando pedir uma tela de autenticação, entregar:

- implementação dentro do app existente, não HTML separado
- manter rotas/componentes atuais quando possível
- usar Tailwind e componentes existentes
- seguir paleta VerticalParts
- preservar responsividade
- garantir estados de erro/loading
- indicar quais arquivos foram alterados

Se precisar criar mockup antes da implementação, salvar separado em uma pasta de design, mas a versão final deve ser integrada ao app.

