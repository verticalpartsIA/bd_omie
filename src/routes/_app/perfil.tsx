import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Settings, User, Building2, Users as UsersIcon, Plug, Bell, Target, Sliders, ScrollText, Save } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { useAuth } from "@/lib/auth-mock";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({ meta: [{ title: "Configurações — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "vendedor", "financeiro", "estoque", "tv"]}>
      <SettingsPage />
    </RoleGuard>
  ),
});

const perfis = [
  { nome: "Admin", desc: "Acesso total a todas as telas e configurações" },
  { nome: "Gestor", desc: "Dashboards, clientes, comercial, pedidos, financeiro" },
  { nome: "Estratégico", desc: "Strategic dashboard e relatórios executivos" },
  { nome: "Analítico", desc: "Analytical dashboard e relatórios detalhados" },
  { nome: "Comercial", desc: "Clientes, vendedores, segmentação, pedidos" },
  { nome: "Financeiro", desc: "Finance, DRE, fluxo de caixa, relatórios" },
  { nome: "Estoque", desc: "Produtos, estoque, movimentações, categorias" },
  { nome: "TV/Operacional", desc: "Apenas painel TV/Operational fullscreen" },
];

const integracoes = [
  { nome: "Omie", desc: "ERP — pedidos, NF, clientes, financeiro", status: "disponível" },
  { nome: "Lovable Cloud", desc: "Backend, autenticação, banco de dados", status: "disponível" },
  { nome: "WhatsApp Business", desc: "Notificações e campanhas RFM", status: "em breve" },
  { nome: "Power BI", desc: "Exportação de modelos para BI corporativo", status: "em breve" },
  { nome: "Google Sheets", desc: "Sincronização bidirecional de planilhas", status: "em breve" },
  { nome: "API REST", desc: "Endpoints públicos para integrações próprias", status: "em breve" },
];

const auditoria = [
  { quando: "12/05 14:32", quem: "Carla Mendes", acao: "Atualizou meta de Bruno Lima para R$ 320k" },
  { quando: "12/05 11:18", quem: "Admin", acao: "Adicionou usuário João Pedro (perfil Comercial)" },
  { quando: "11/05 17:55", quem: "Sistema", acao: "Backup automático concluído" },
  { quando: "11/05 09:12", quem: "Beatriz A.", acao: "Ajuste de inventário em CAB-6X19 (-12 un)" },
  { quando: "10/05 16:40", quem: "Admin", acao: "Atualizou alerta de cobertura mínima para 7 dias" },
];

function SettingsPage() {
  const toggle = useSidebarToggle();
  const { user } = useAuth();
  const [tab, setTab] = useState("perfil");

  const save = () => toast.success("Configurações salvas");

  return (
    <>
      <Topbar crumb="SISTEMA · CONFIGURAÇÕES" title="Configurações" icon={<Settings className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <h2 className="text-[26px] font-extrabold tracking-tight">Configurações & Administração</h2>
        <p className="mt-1 text-sm text-muted-foreground">Perfil, empresa, equipe, integrações, alertas, metas, parâmetros e auditoria.</p>

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="perfil"><User className="mr-1.5 h-3.5 w-3.5" /> Perfil</TabsTrigger>
            <TabsTrigger value="empresa"><Building2 className="mr-1.5 h-3.5 w-3.5" /> Empresa</TabsTrigger>
            <TabsTrigger value="usuarios"><UsersIcon className="mr-1.5 h-3.5 w-3.5" /> Usuários</TabsTrigger>
            <TabsTrigger value="integracoes"><Plug className="mr-1.5 h-3.5 w-3.5" /> Integrações</TabsTrigger>
            <TabsTrigger value="alertas"><Bell className="mr-1.5 h-3.5 w-3.5" /> Alertas</TabsTrigger>
            <TabsTrigger value="metas"><Target className="mr-1.5 h-3.5 w-3.5" /> Metas</TabsTrigger>
            <TabsTrigger value="parametros"><Sliders className="mr-1.5 h-3.5 w-3.5" /> Parâmetros</TabsTrigger>
            <TabsTrigger value="auditoria"><ScrollText className="mr-1.5 h-3.5 w-3.5" /> Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="mt-4">
            <Card title="Meu perfil" subtitle="Suas informações de acesso">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Nome"><Input defaultValue={user?.nome ?? ""} /></Field>
                <Field label="E-mail"><Input defaultValue={user?.email ?? ""} /></Field>
                <Field label="Cargo"><Input defaultValue="Diretor Comercial" /></Field>
                <Field label="Telefone"><Input defaultValue="(11) 9 9000-0000" /></Field>
                <Field label="Senha atual"><Input type="password" /></Field>
                <Field label="Nova senha"><Input type="password" /></Field>
              </div>
              <SaveBar onSave={save} />
            </Card>
          </TabsContent>

          <TabsContent value="empresa" className="mt-4">
            <Card title="Dados da empresa" subtitle="Aparece em relatórios e e-mails">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Razão social"><Input defaultValue="VerticalParts Indústria e Comércio Ltda" /></Field>
                <Field label="CNPJ"><Input defaultValue="12.345.678/0001-90" /></Field>
                <Field label="Endereço"><Input defaultValue="Av. das Indústrias, 1500 — São Paulo/SP" /></Field>
                <Field label="Telefone"><Input defaultValue="(11) 4000-1500" /></Field>
                <Field label="Domínio do logo"><Input defaultValue="verticalparts.com.br" /></Field>
                <Field label="Cor primária"><Input defaultValue="#F5C400" /></Field>
              </div>
              <SaveBar onSave={save} />
            </Card>
          </TabsContent>

          <TabsContent value="usuarios" className="mt-4 space-y-4">
            <Card title="Perfis e permissões" subtitle="8 perfis pré-configurados controlam o que cada usuário vê">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {perfis.map((p) => (
                  <div key={p.nome} className="rounded border border-border bg-background p-3">
                    <div className="text-sm font-bold">{p.nome}</div>
                    <div className="text-[11px] text-muted-foreground">{p.desc}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Usuários ativos" subtitle="Gerencie quem tem acesso ao sistema">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[10px] font-bold uppercase text-muted-foreground">
                    <tr><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">E-mail</th><th className="px-3 py-2 text-left">Perfil</th><th className="px-3 py-2 text-left">Status</th></tr>
                  </thead>
                  <tbody>
                    {[
                      ["Carla Mendes", "carla@verticalparts.com.br", "Admin", "Ativo"],
                      ["Bruno Lima", "bruno@verticalparts.com.br", "Comercial", "Ativo"],
                      ["Beatriz Alves", "beatriz@verticalparts.com.br", "Estoque", "Ativo"],
                      ["João Pedro", "joao@verticalparts.com.br", "Financeiro", "Convidado"],
                    ].map(([n, e, p, s]) => (
                      <tr key={e} className="border-t border-border">
                        <td className="px-3 py-2 font-medium">{n}</td>
                        <td className="px-3 py-2 text-xs">{e}</td>
                        <td className="px-3 py-2 text-xs">{p}</td>
                        <td className="px-3 py-2 text-xs">{s}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3"><Button onClick={() => toast.success("Convite enviado")}>Convidar usuário</Button></div>
            </Card>
          </TabsContent>

          <TabsContent value="integracoes" className="mt-4">
            <Card title="Conectores" subtitle="Sincronize seu ERP, BI e canais de comunicação">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {integracoes.map((i) => (
                  <div key={i.nome} className="flex items-center justify-between rounded border border-border bg-background p-3">
                    <div>
                      <div className="text-sm font-bold">{i.nome}</div>
                      <div className="text-[11px] text-muted-foreground">{i.desc}</div>
                    </div>
                    <Button size="sm" variant="outline" disabled={i.status !== "disponível"} onClick={() => toast.info(`Conectando ${i.nome}...`)}>
                      {i.status === "disponível" ? "Conectar" : "Em breve"}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="alertas" className="mt-4">
            <Card title="Alertas configuráveis" subtitle="Defina os gatilhos que disparam notificações">
              <ul className="divide-y divide-border">
                {[
                  ["Cliente sem comprar há mais de 60 dias", true],
                  ["Cobertura de SKU abaixo de 7 dias", true],
                  ["SLA logístico abaixo de 90%", true],
                  ["Inadimplência acima de 5%", true],
                  ["Margem de categoria abaixo de 25%", false],
                  ["Vendedor abaixo de 70% da meta no dia 15", true],
                ].map(([label, on], i) => (
                  <li key={i} className="flex items-center justify-between py-2.5">
                    <span className="text-sm">{label}</span>
                    <Switch defaultChecked={on as boolean} />
                  </li>
                ))}
              </ul>
              <SaveBar onSave={save} />
            </Card>
          </TabsContent>

          <TabsContent value="metas" className="mt-4">
            <Card title="Metas globais" subtitle="Usadas em dashboards e ranking de vendedores">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Meta de receita mensal (R$)"><Input defaultValue="5500000" /></Field>
                <Field label="Meta EBITDA (%)"><Input defaultValue="22" /></Field>
                <Field label="Meta SLA logístico (%)"><Input defaultValue="95" /></Field>
                <Field label="Meta inadimplência máx (%)"><Input defaultValue="3.5" /></Field>
                <Field label="Meta giro de estoque (x)"><Input defaultValue="4" /></Field>
                <Field label="Meta cobertura mínima (dias)"><Input defaultValue="15" /></Field>
              </div>
              <SaveBar onSave={save} />
            </Card>
          </TabsContent>

          <TabsContent value="parametros" className="mt-4">
            <Card title="Parâmetros operacionais" subtitle="Regras de negócio padrão para estoque e financeiro">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Lead time padrão (dias)"><Input defaultValue="7" /></Field>
                <Field label="Estoque de segurança (%)"><Input defaultValue="20" /></Field>
                <Field label="Prazo médio recebimento (dias)"><Input defaultValue="30" /></Field>
                <Field label="Prazo médio pagamento (dias)"><Input defaultValue="45" /></Field>
                <Field label="Comissão padrão (%)"><Input defaultValue="2.5" /></Field>
                <Field label="Imposto sobre venda (%)"><Input defaultValue="14" /></Field>
              </div>
              <SaveBar onSave={save} />
            </Card>
          </TabsContent>

          <TabsContent value="auditoria" className="mt-4">
            <Card title="Log de auditoria" subtitle="Últimas ações relevantes do sistema">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[10px] font-bold uppercase text-muted-foreground">
                    <tr><th className="px-3 py-2 text-left">Quando</th><th className="px-3 py-2 text-left">Quem</th><th className="px-3 py-2 text-left">Ação</th></tr>
                  </thead>
                  <tbody>
                    {auditoria.map((a, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-xs">{a.quando}</td>
                        <td className="px-3 py-2 text-xs">{a.quem}</td>
                        <td className="px-3 py-2 text-xs">{a.acao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h4 className="text-sm font-bold">{title}</h4>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="mt-4 flex justify-end border-t border-border pt-4">
      <Button onClick={onSave}><Save className="mr-2 h-4 w-4" /> Salvar alterações</Button>
    </div>
  );
}