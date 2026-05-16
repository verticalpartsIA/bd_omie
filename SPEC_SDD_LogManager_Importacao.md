# SPEC SDD - Modulo de Importacao inspirado no LogManager / LogComex

Documento para orientar Claude Designer na continuidade do projeto VerticalParts.

Data da investigacao: 2026-05-14  
Escopo: engenharia reversa funcional, navegacao autenticada normal e leitura de trafego carregado pelo proprio navegador.  
Regra de seguranca: nao burlar autenticacao, nao submeter formularios, nao alterar dados, nao gravar credenciais, tokens ou cookies no projeto.

## 1. Objetivo do produto

Criar no projeto VerticalParts uma experiencia de gestao de importacao semelhante ao LogManager, com foco em:

- monitoramento de embarques maritimos, aereos e rodoviarios;
- centralizacao de pedidos de compra, licencas de importacao, documentos, container tracking e status aduaneiro;
- visao de mapa/rota, linha do tempo, ETA/ETD e alertas operacionais;
- apoio ao cadastro de produtos/DUIMP/Catalogo de Produtos, sem inventar NCM, descricao tecnica ou codigo fiscal;
- painel de integracoes com Omie, Siscomex/Portal Unico, tracking logistico e base interna VerticalParts.

O primeiro uso do sistema deve ser operacional, nao marketing. A tela inicial depois do login deve ser um dashboard de trabalho.

## 2. Evidencias coletadas

Pasta de evidencias:

`C:\Users\gelso\Projetos_Sites\bd_Omie\logmanager_research`

Arquivos principais:

- `01_login.png`: tela de login.
- `02_plataforma_home_pos_login.png`: hub da plataforma LogComex com card LogManager.
- `03_logmanager_workspace_home.png`: workspace do LogManager.
- `06_modulo_Meus pedidos.png`: aba/listagem de pedidos de compra.
- `08_modulo_Meus embarques.png`: estado de workspace relacionado a embarques.
- `api_capture_workspace.png`: captura final do workspace.
- `deep_snapshots.json`: textos, botoes, campos e tabelas extraidos.
- `deep_network.json`: endpoints observados.
- `api_responses.json`: respostas JSON de APIs carregadas pelo workspace, com tokens/senhas redigidos.

## 3. Quantidade de telas / areas funcionais

O LogManager e uma SPA: varias areas ficam na mesma rota base `https://logmanager.logcomex.io/workspace`, com estado interno por abas. Portanto nao tratar como paginas HTML separadas, mas como telas/estados funcionais.

Telas/areas confirmadas ou identificadas:

1. Login.
2. Hub da plataforma LogComex.
3. Workspace Home do LogManager.
4. Meus pedidos / Pedidos de compra.
5. Minhas licencas / Licencas de Importacao.
6. Meus embarques.
7. Embarques arquivados.
8. Gestao Pre-Embarque.
9. Area de documentos.
10. Dashboard.
11. Auto Pilot.
12. Notificacoes.
13. Insights.
14. Catalogo de produtos.
15. Painel de integracoes.

Contagem pratica para o nosso projeto: criar pelo menos 15 areas de UI, mesmo que algumas com dados mockados inicialmente.

## 4. Fluxo principal observado

1. Usuario acessa a tela de login.
2. Informa e-mail e senha.
3. Plataforma valida se precisa reCAPTCHA.
4. Plataforma autentica e retorna sessao com cliente, usuario, permissoes e produto contratado.
5. Usuario entra no hub LogComex.
6. Card `LogManager` mostra a descricao: gestao e monitoramento em tempo real das etapas de embarques maritimos, aereos e rodoviarios.
7. Botao `Acessar` abre o workspace do LogManager.
8. Workspace mostra contadores de PO, LI, embarques, mapa/itinerario e cards de gestao/documentos.

## 5. Formulários preenchíveis observados

### Login

Campos:

- E-mail.
- Senha.

Acoes:

- Entrar.
- Entrar com Google.
- Esqueceu a senha.
- Seletor de idioma.

### Nova Licença de Importação (LI)

Foi observada uma gaveta/modal de nova LI. Nao foi preenchido nem enviado.

Campos:

- Numero da LI.
- Referencia da LI (opcional).
- Selecione o Importador.

Acoes:

- Cancelar.
- Cadastrar.

### Filtros de pedidos de compra

Na area `Meus pedidos`, foram observados filtros e tabela operacional.

Filtros/campos:

- Ordem de compra.
- Descricao do item da PO.
- Item (part-number).
- Numero da PO.
- Referencia da PO.
- Exportador.
- Importador.
- Status da PO.

Acoes:

- Limpar filtros.
- Cadastrar PO.

Colunas da tabela:

- Acao.
- Numero da PO.
- Referencia da PO.
- Status da PO.
- Embarque vinculado.
- Importador.
- Exportador.
- Data de emissao.
- Incoterm.
- Moeda.
- Condicao de pagamento.

### Seletor de periodo / mapa

No workspace existe filtro de periodo para embarques maritimos com chegada prevista:

- Proximos 7 dias.

O endpoint usado para isso recebeu periodo `2026-05-14` a `2026-05-21`.

## 6. Dados e indicadores observados

Workspace Home:

- Pedidos de compra em andamento: 1 total.
- Licencas de Importacao em andamento: 0 total.
- Embarques em andamento: 6 total.
- Embarques maritimos com chegada prevista nos proximos 7 dias: sem embarques.

Contadores via API:

- Embarques: `awaitingBoarding=0`, `inTransit=4`, `unloaded=2`, `total=6`.
- Pedidos de compra: `created=0`, `inTransit=0`, `delivered=1`, `total=1`.
- Licencas de importacao: `awaitingAnalysis=0`, `rejected=0`, `accepted=0`, `total=0`.
- Demurrage/free time: `amountFreeTimeCloseToExpiring=0`, `amountExpiredFreeTime=0`.
- Monitoramento multimodal: `registered=68`, `total=400`.
- Catalogo de Produtos: `publishedItems=0`, `publishLimit=2000`.

Colunas configuraveis da lista de embarques:

- reference
- status
- etd
- eta
- predictiveEta
- createdAt
- customsClearanceChannel
- freeTimeExpiration
- demurrageTotalValue
- demurrageDays
- transitTime
- operator
- origin
- destination
- transportDocument
- di
- warehouseReceipt
- customsClearance
- diRegister
- plus-column

## 7. Integrações e APIs observadas

Hosts principais:

- `apiauth.logcomex.io`: autenticacao, sessao, cliente, menu, plano.
- `api-tracking.logcomex.io`: workspace, contadores, embarques, itinerario, envolvidos, tracking.
- `api-prd-portal-despachante-catalogo.logcomex.io`: estatisticas do Catalogo de Produtos.
- `api.logcomex.io`: credenciais/configuracoes do cliente.
- `api.logcomex.com.br`: checks auxiliares.

Endpoints relevantes:

- `POST /api/check-recaptcha-required`
- `POST /api/login`
- `POST /api/twofactor/password`
- `POST /api/check-token`
- `GET /api/customer`
- `GET /api/menu`
- `GET /workspace/dashboard-count?type=shipments`
- `GET /workspace/dashboard-count?type=purchase-orders`
- `GET /workspace/dashboard-count?type=import-licenses`
- `GET /workspace/vessel-itinerary?period[0]=...&period[1]=...`
- `GET /workspace/banner/demurrage`
- `GET /multimodal/counter`
- `GET /multimodal/customerRoutesInfo`
- `GET /user/customization/list-shipment`
- `GET /involved/auto-complete?...involvedSlug=consignee`
- `GET /purchase-order`
- `GET /api/v2/catalog/usage-statistics`

Sistemas externos inferidos pelo dominio de dados:

- Portal Unico / Siscomex / DUIMP: nao foi observado endpoint direto chamado `siscomex` nesta sessao, mas a UI e os dados contemplam LI, DI, canal de parametrizacao, registro de DI, desembaraco e Catalogo de Produtos.
- Tracking logistico: confirmado por `api-tracking.logcomex.io`, com dados de embarque, ETA/ETD, demurrage, free time, itinerario de navio e rotas multimodais.
- Cadastro de envolvidos: confirmado por autocomplete de consignatario/importador.
- Catalogo de Produtos: confirmado por endpoint de estatisticas de publicacao e limite.
- Analytics/marketing: Google, HubSpot, Mixpanel, Hotjar, LinkedIn, Facebook/Bing. Para o nosso produto, nao replicar analytics antes da regra de privacidade estar definida.

Nao afirmar que ha envio direto para Siscomex sem implementar e validar uma integracao oficial. Para o projeto VerticalParts, desenhar uma camada `Integracoes` que permita Siscomex/Portal Unico no futuro, mas manter status como "nao configurado" ate existir credencial e homologacao.

## 8. Atualização de dados

Comportamento confirmado:

- Ao entrar no workspace, o front-end chama APIs de contadores, colunas de embarque, rota/itinerario, demurrage e envolvidos.
- Ao recarregar o workspace, os endpoints sao chamados novamente.
- O periodo de mapa/itinerario e carregado com uma janela de 7 dias.
- Em observacao curta, nao foi confirmado WebSocket nem polling continuo. Tratar "tempo real" como atualizacao sob demanda por API, com botao de atualizar e recarregamento automatico opcional.

Recomendacao de design:

- Adicionar indicador "Atualizado em HH:mm".
- Botao iconico de atualizar.
- Atualizacao automatica configuravel a cada 5 ou 10 minutos para dashboard.
- Nunca atualizar formulario em edicao sem aviso.

## 9. Comportamento esperado ao receber número de container

Nao foi possivel observar um cadastro de container sem risco de alterar dados. O comportamento abaixo deve ser implementado como requisito do nosso sistema, baseado nos endpoints e no dominio da tela:

1. Usuario informa numero do container ou documento de transporte.
2. Sistema cria/atualiza um embarque em estado "Aguardando tracking".
3. Sistema consulta provedor de tracking/logistica.
4. Se encontrar dados, preencher:
   - transportDocument
   - container
   - operador/armador
   - origem
   - destino
   - ETD
   - ETA
   - predictive ETA
   - status do embarque
   - transit time
   - free time/demurrage
5. Se nao encontrar, mostrar status "Aguardando primeira leitura" e permitir tentativa manual.
6. Toda mudanca deve gerar evento na linha do tempo.

## 10. Linha do tempo, navio e mapa

Confirmado:

- O workspace tem bloco de mapa/itinerario.
- Texto observado: "Adicione agora seus embarques e visualize-os aqui no mapa".
- Existe endpoint `workspace/vessel-itinerary` com periodo de 7 dias.
- Para o periodo investigado, a resposta foi lista vazia.

Para o projeto VerticalParts, implementar:

- Mapa com marcadores de origem, porto atual, destino e chegada prevista.
- Linha do tempo lateral por embarque.
- Estados minimos:
  - Pedido criado.
  - Fornecedor confirmou prontidao.
  - Booking confirmado.
  - Container informado.
  - Container carregado.
  - Navio embarcado.
  - Em transito.
  - Chegada prevista.
  - Descarregado.
  - DI/DUIMP registrada.
  - Canal parametrizado.
  - Desembaraco.
  - Entregue.

## 11. Estrutura de UI para Claude Designer

### Layout geral

- Sidebar fixa à esquerda com modulos:
  - Workspace
  - Dashboard
  - Auto Pilot
  - Notificacoes
  - Insights
  - Catalogo de produtos
  - Painel de integracoes
- Topbar com usuario, empresa e seletor de ambiente.
- Area central com abas quando estiver no workspace:
  - Home
  - Meus pedidos
  - Minhas licencas
  - Meus embarques
  - Embarques arquivados

### Paleta

Usar identidade VerticalParts observada na conta:

- Primaria: `#CBB806`
- Fundo: `#F7F8FA`
- Superficie: `#FFFFFF`
- Texto principal: `#1F2933`
- Texto secundario: `#667085`
- Bordas: `#D9DEE8`
- Sucesso: `#16A34A`
- Alerta: `#D97706`
- Erro: `#DC2626`
- Info: `#2563EB`

Evitar telas roxas/azuis genericas. O visual deve ser operacional, limpo e denso.

### Componentes obrigatórios

- Cards de status com numero, legenda e botao de acesso.
- Tabela de pedidos de compra com filtros.
- Tabela de embarques com colunas configuraveis.
- Drawer lateral para criar/editar LI, PO e embarque.
- Modal apenas para confirmacoes destrutivas.
- Mapa de embarques.
- Linha do tempo por embarque.
- Painel de documentos.
- Painel de integracoes.
- Notificacoes/alertas.
- Botao de atualizar dados.
- Indicador de ultima atualizacao.

## 12. Modelo de dados sugerido

Entidades:

- User
- Company
- Importer/Consignee
- Exporter/Supplier
- PurchaseOrder
- PurchaseOrderItem
- ImportLicense
- Shipment
- ShipmentContainer
- ShipmentEvent
- TransportDocument
- DocumentFolder
- DocumentFile
- ProductCatalogItem
- IntegrationCredential
- IntegrationEventLog
- Notification

Campos chave para `Shipment`:

- reference
- status
- modal: maritime | air | road
- origin
- destination
- operator
- vesselName
- voyage
- transportDocument
- containerNumbers
- etd
- eta
- predictiveEta
- transitTime
- customsClearanceChannel
- customsClearanceStatus
- diNumber
- diRegisterDate
- duimpNumber
- warehouseReceipt
- freeTimeExpiration
- demurrageDays
- demurrageTotalValue
- createdAt
- updatedAt

## 13. Requisitos funcionais para o nosso projeto

1. Autenticacao com tela propria VerticalParts.
2. Dashboard pos-login como primeira tela.
3. Workspace com KPIs de PO, LI e embarques.
4. Cadastro/consulta de PO.
5. Cadastro/consulta de LI.
6. Cadastro/consulta de embarques.
7. Lista de embarques com colunas configuraveis.
8. Detalhe do embarque com linha do tempo.
9. Mapa de rota/itinerario.
10. Painel de documentos por processo.
11. Catalogo de produtos conectado ao trabalho de SKU, NCM e descricao tecnica.
12. Painel de integracoes com status: Omie, Siscomex/Portal Unico, Tracking, Catalogo de Produtos.
13. Log de sincronizacao por integracao.
14. Notificacoes por atraso, ETA alterado, demurrage/free time, LI pendente, documento faltante.
15. Nao permitir palavra "KIT" em descricao/SKU/cadastro final de produto.

## 14. Requisitos não funcionais

- Nao armazenar senha em localStorage.
- Tokens devem ser httpOnly ou tratados no backend.
- Logs devem mascarar tokens, CPF, telefone, documentos pessoais e credenciais.
- Toda integracao deve ter historico de ultima tentativa, resposta e erro.
- UI deve funcionar bem em desktop; mobile pode ser leitura/consulta.
- Tabelas precisam de filtros, ordenacao e exportacao futura.
- Formularios devem ter estados de rascunho, validacao e confirmacao antes de enviar.

## 15. Observações importantes

- A conta observada possui permissao de visualizacao do LogManager.
- Plano observado indica `apiAccess: false`; portanto nao desenhar dependencia obrigatoria de API publica da LogComex.
- O menu lateral do LogManager existe, mas algumas areas nao trocaram rota visivel durante a coleta por comportamento interno da SPA e/ou overlay de drawer. Ainda assim, os modulos devem ser criados no projeto porque aparecem claramente no produto.
- Nao replicar marca LogComex. O objetivo e construir uma experiencia VerticalParts inspirada nos fluxos e necessidades operacionais.
- Dados fiscais, NCM, DI, DUIMP e classificacao devem ficar como "pendente de validacao fiscal/despachante" quando nao houver fonte oficial.

## 16. Entrega esperada do Claude Designer

Criar uma interface funcional no projeto atual com:

- tela de login VerticalParts;
- dashboard/workspace de importacao;
- menu lateral com os 7 modulos principais;
- abas do workspace;
- dados mockados realistas baseados neste SDD;
- tabelas, filtros, drawers, mapa placeholder e linha do tempo;
- painel de integracoes e status de sincronizacao;
- componentes reaproveitaveis e preparados para futura ligacao com backend/Supabase/Omie.

Prioridade visual: ferramenta de trabalho real, compacta, clara, com informacao escaneavel e sem cara de landing page.
