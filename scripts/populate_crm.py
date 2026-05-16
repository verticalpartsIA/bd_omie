#!/usr/bin/env python3
"""
=============================================================
 POPULADOR CRM OMIE — VerticalParts
=============================================================
 Origem: Supabase PN_Omie (13.827 parceiros) + omie_orders
 Destino: Omie CRM (Contas + Contatos + Oportunidades)

 O que faz:
  1. Lê todos os PNs do Supabase
  2. Agrega pedidos por cliente (valor total, qtd, última data)
  3. Classifica ABC (A=top80%, B=próx15%, C=rest5%)
  4. UpsertConta -> envia conta enriquecida ao CRM
  5. UpsertContato -> cria contato vinculado (se tiver email/tel)
  6. UpsertOportunidade -> cria oportunidade p/ ABC-A e ABC-B ativos

 Uso:
   python populate_crm.py            # Roda tudo
   python populate_crm.py --test 20  # Testa com os 20 primeiros
   python populate_crm.py --skip-ops # Pula oportunidades
=============================================================
"""

import requests, json, time, sys, os, re, math, unicodedata, io
# Force UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
elif sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from datetime import datetime, date
from collections import defaultdict

# ── Credenciais ────────────────────────────────────────────
OMIE_KEY    = "8463170967"
OMIE_SECRET = "69e22b773842044fdb218178521cac59"
OMIE_API    = "https://app.omie.com.br/api/v1"

SUPA_URL = "https://kgecbycsyrtdhmdziuul.supabase.co"
SUPA_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZWNieWNzeXJ0ZGhtZHppdXVsIiwicm9sZSI6"
    "InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyMzE5NiwiZXhwIjoyMDkzNDk5MTk2fQ."
    "mF6ApvDd3dcxjZ1OEgYC86ShpIdMTIMNJCfbZYrX87o"
)

DELAY = 0.5    # segundos entre chamadas Omie (~2 req/s, seguro para evitar rate limit)

# ── IDs fixos do CRM Omie ──────────────────────────────────
CRM_VERTICAIS = {
    "manutencao": 602540665, "elevador": 602540665, "repara": 602540665,
    "moderniza": 602540665, "ascensor": 602540665,
    "shopping":  602540656,
    "hospital":  602540657, "clinica":  602540657, "saude": 602540657, "medic": 602540657,
    "hotel":     602540662, "pousada": 602540662, "turismo": 602540662, "resort": 602540662,
    "construtora": 602540670, "incorpora": 602540670, "engenharia": 602540670, "obra": 602540670,
    "supermercado": 602540669, "atacadao": 602540669, "atacado": 602540669,
    "prefeitura": 2825365665, "secretaria": 2825365665, "tribunal": 2825365665, "ministerio": 2825365665,
    "condominio": 2718575850, "administradora": 2718575850, "sindico": 2718575850,
    "metro":      602540654, "ferrovia": 602540654, "trem": 602540654,
    "loja":       602540666, "varejo": 602540666, "comercio": 602540666,
    "escola":     602540668, "universidade": 602540668, "faculdade": 602540668, "colegio": 602540668,
}

REGIAO_MAP = {
    "SP": "Sudeste", "RJ": "Sudeste", "MG": "Sudeste", "ES": "Sudeste",
    "RS": "Sul",     "SC": "Sul",     "PR": "Sul",
    "BA": "Nordeste","SE": "Nordeste","AL": "Nordeste","PE": "Nordeste",
    "PB": "Nordeste","RN": "Nordeste","CE": "Nordeste","PI": "Nordeste","MA": "Nordeste",
    "GO": "Centro-Oeste","DF": "Centro-Oeste","MT": "Centro-Oeste",
    "MS": "Centro-Oeste","TO": "Centro-Oeste",
    "PA": "Norte","AM": "Norte","AC": "Norte","RR": "Norte","RO": "Norte","AP": "Norte",
}

# IDs fixos (verificados via API)
ID_ORIGEM_ERP    = 2848704931  # "Cliente Empresa" — origem: base ERP
ID_ORIGEM_EMAIL  = 602540609   # "Email Comercial"
ID_ORIGEM_TEL    = 602540610   # "Telefone Empresa"
ID_FASE_PROSPECT = 602540589   # "01 Prospect"
ID_FASE_CONCLUSAO= 602540595   # "06 Conclusão"
ID_STATUS_ATIVO  = 602540629   # "Ativo"
ID_STATUS_CONQ   = 602540634   # "Conquistado"

# ── Helpers ────────────────────────────────────────────────
def omie_call(endpoint: str, call: str, params: dict) -> dict:
    url = f"{OMIE_API}/{endpoint}/"
    body = {
        "call": call,
        "app_key": OMIE_KEY,
        "app_secret": OMIE_SECRET,
        "param": [params]
    }
    for attempt in range(5):
        try:
            r = requests.post(url, json=body, timeout=30)
            data = r.json()
            time.sleep(DELAY)
            # Trata rate limit: "Consumo redundante detectado. Aguarde N segundos"
            fault = data.get("faultstring", "")
            if "redundante" in fault.lower() or "aguarde" in fault.lower():
                import re as _re
                m = _re.search(r"(\d+)\s*segundo", fault)
                wait = int(m.group(1)) + 2 if m else 35
                print(f"   [RATE LIMIT] Aguardando {wait}s...")
                time.sleep(wait)
                continue  # retry
            return data
        except Exception as e:
            print(f"   [RETRY {attempt+1}] {e}")
            time.sleep(3)
    return {"faultcode": "TIMEOUT", "faultstring": "5 retries exhausted"}

def supa_get_all(table: str, select: str = "*", extra_filter: str = "") -> list:
    """Lê todos os registros de uma tabela Supabase (paginado 1000)."""
    headers = {
        "apikey": SUPA_KEY,
        "Authorization": f"Bearer {SUPA_KEY}",
        "Prefer": "count=exact",
        "Range": "0-0",
    }
    # Pega o total primeiro
    url = f"{SUPA_URL}/rest/v1/{table}?select={select}&limit=1{extra_filter}"
    r = requests.get(url, headers=headers, timeout=30)
    cr = r.headers.get("Content-Range", "0-0/0")
    total = int(cr.split("/")[1]) if "/" in cr else 0
    print(f"   [{table}] total: {total}")

    all_rows = []
    headers_read = {"apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}"}
    batch = 1000
    for offset in range(0, max(total, 1), batch):
        url = f"{SUPA_URL}/rest/v1/{table}?select={select}&limit={batch}&offset={offset}{extra_filter}"
        r = requests.get(url, headers=headers_read, timeout=30)
        chunk = r.json()
        if isinstance(chunk, list):
            all_rows.extend(chunk)
        if len(all_rows) >= total:
            break
    return all_rows

def normaliza(texto: str) -> str:
    """Remove acentos para busca de palavras-chave."""
    nfkd = unicodedata.normalize("NFKD", (texto or "").lower())
    return "".join(c for c in nfkd if not unicodedata.combining(c))

def detect_vertical(nome: str, fantasia: str = "") -> int:
    texto = normaliza(nome + " " + (fantasia or ""))
    for kw, cod in CRM_VERTICAIS.items():
        if kw in texto:
            return cod
    return 602540665  # default Manutenção (core business VerticalParts)

def get_regiao(estado: str) -> str:
    return REGIAO_MAP.get((estado or "").upper(), "")

def format_brl(valor: float) -> str:
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def parse_date_br(d: str) -> str:
    """Converte '2024-03-26T...' -> '26/03/2024' para Omie."""
    if not d:
        return ""
    try:
        dt = datetime.fromisoformat(d.replace("Z", "+00:00"))
        return dt.strftime("%d/%m/%Y")
    except:
        return ""

def split_nome(nome: str):
    """Divide razão social em 'nome' e 'sobrenome' para contato."""
    partes = (nome or "").strip().split()
    if len(partes) == 1:
        return partes[0], ""
    return partes[0], " ".join(partes[1:])

CHECKPOINT_FILE = os.path.join(os.path.dirname(__file__), "crm_checkpoint.json")

def load_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {"done_contas": [], "done_contatos": [], "done_opps": [], "nCod_map": {}, "nContato_map": {}}

def save_checkpoint(cp):
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump(cp, f, ensure_ascii=False)

# ── MAIN ───────────────────────────────────────────────────
def main():
    test_limit  = None
    skip_opps   = "--skip-ops" in sys.argv
    resume      = "--resume" in sys.argv
    if "--test" in sys.argv:
        idx = sys.argv.index("--test")
        test_limit = int(sys.argv[idx + 1]) if idx + 1 < len(sys.argv) else 20

    print("=" * 60)
    print(" POPULADOR CRM OMIE — VerticalParts")
    print(f" Inicio: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f" Modo: {'TESTE ' + str(test_limit) if test_limit else 'COMPLETO'}")
    print(f" Resume: {'SIM' if resume else 'NAO'}")
    print("=" * 60)

    # Checkpoint
    cp = load_checkpoint() if resume else {"done_contas": [], "done_contatos": [], "done_opps": [], "nCod_map": {}, "nContato_map": {}}
    nCod_map_str    = cp.get("nCod_map", {})      # chaves sao strings no JSON
    nContato_map_str= cp.get("nContato_map", {})
    done_contas_set = set(cp.get("done_contas", []))
    done_cont_set   = set(cp.get("done_contatos", []))
    done_opps_set   = set(cp.get("done_opps", []))
    # Converte chaves de str para int
    nCod_map     = {int(k): v for k, v in nCod_map_str.items()}
    nContato_map = {int(k): v for k, v in nContato_map_str.items()}
    if resume:
        print(f" Retomando: {len(done_contas_set)} contas ja processadas")

    # ── 1. Carregar PN_Omie do Supabase ───────────────────
    print("\n[1/5] Carregando parceiros de negócios do Supabase...")
    pns = supa_get_all(
        "PN_Omie",
        select="codigo_cliente_omie,codigo_cliente_integracao,razao_social,"
               "nome_fantasia,cnpj_cpf,email,telefone,endereco,bairro,cidade,"
               "estado,cep,situacao,tags,data_inclusao_omie,data_alteracao_omie"
    )
    print(f"   Carregados: {len(pns)} PNs")

    # Índice por codigo_cliente_omie
    pn_index = {p["codigo_cliente_omie"]: p for p in pns}

    # ── 2. Agregar pedidos por cliente ────────────────────
    print("\n[2/5] Agregando pedidos por cliente...")
    orders = supa_get_all(
        "omie_orders",
        select="codigo_cliente_omie,valor_total_pedido,data_inclusao,etapa"
    )
    print(f"   Pedidos carregados: {len(orders)}")

    # Agrega: total, count, last_date por cliente
    stats: dict = defaultdict(lambda: {"total": 0.0, "count": 0, "last_date": ""})
    for o in orders:
        cid  = o.get("codigo_cliente_omie")
        val  = float(o.get("valor_total_pedido") or 0)
        dt   = o.get("data_inclusao") or ""
        if not cid:
            continue
        s = stats[cid]
        s["total"] += val
        s["count"] += 1
        if dt > s["last_date"]:
            s["last_date"] = dt

    # ── 3. Classificação ABC ──────────────────────────────
    print("\n[3/5] Classificando ABC...")
    clientes_com_pedido = [(cid, s["total"]) for cid, s in stats.items() if s["total"] > 0]
    clientes_com_pedido.sort(key=lambda x: x[1], reverse=True)
    total_geral = sum(v for _, v in clientes_com_pedido)

    abc: dict = {}
    acum = 0.0
    for cid, val in clientes_com_pedido:
        acum += val
        perc = acum / total_geral if total_geral > 0 else 0
        if perc <= 0.80:
            abc[cid] = "A"
        elif perc <= 0.95:
            abc[cid] = "B"
        else:
            abc[cid] = "C"

    cnt_a = sum(1 for v in abc.values() if v == "A")
    cnt_b = sum(1 for v in abc.values() if v == "B")
    cnt_c = sum(1 for v in abc.values() if v == "C")
    print(f"   ABC-A: {cnt_a} | ABC-B: {cnt_b} | ABC-C: {cnt_c}")
    print(f"   Sem pedido: {len(pns) - len(abc)}")

    # ── 4. Upsert Contas CRM ──────────────────────────────
    print("\n[4/5] Criando/atualizando Contas no CRM...")
    if test_limit:
        pns_to_process = pns[:test_limit]
    else:
        pns_to_process = pns

    stats_ok    = len(done_contas_set)   # conta as já feitas no resume
    stats_err   = 0
    opp_targets = []   # PNs elegíveis para oportunidade

    total = len(pns_to_process)
    for idx, pn in enumerate(pns_to_process):
        cid   = pn.get("codigo_cliente_omie")
        # Pula se já processado (resume)
        if cid in done_contas_set:
            continue
        nome  = (pn.get("razao_social") or "SEM RAZÃO SOCIAL").strip()
        fant  = (pn.get("nome_fantasia") or "").strip()
        codint= str(pn.get("codigo_cliente_integracao") or cid or "")
        doc   = (pn.get("cnpj_cpf") or "").strip()
        email = (pn.get("email") or "").strip().split(";")[0].strip()
        tel   = (pn.get("telefone") or "").strip()
        end   = (pn.get("endereco") or "").strip()
        bairro= (pn.get("bairro") or "").strip()
        cidade= (pn.get("cidade") or "").strip()
        estado= (pn.get("estado") or "").strip().upper()
        cep   = (pn.get("cep") or "").strip()
        sit   = (pn.get("situacao") or "Ativo").strip()
        tags  = pn.get("tags") or []
        dt_inc= parse_date_br(pn.get("data_inclusao_omie") or "")

        # Dados de compras
        s       = stats.get(cid, {"total": 0, "count": 0, "last_date": ""})
        total_v = s["total"]
        n_ped   = s["count"]
        last_dt = parse_date_br(s["last_date"])
        classe  = abc.get(cid, "—")

        # Cálculo ticket médio
        ticket  = (total_v / n_ped) if n_ped > 0 else 0

        # Vertical
        nCodVert = detect_vertical(nome, fant)

        # Região
        regiao = get_regiao(estado)

        # Telefone: separa DDD
        ddd_tel, num_tel = "", tel
        m = re.match(r"^\(?(\d{2})\)?\s*(.+)$", tel)
        if m:
            ddd_tel = m.group(1)
            num_tel = m.group(2)

        # Observação enriquecida
        hoje_str = date.today().strftime("%d/%m/%Y")
        obs_parts = [
            f"* Importado do ERP Omie em {hoje_str}.",
        ]
        if n_ped > 0:
            obs_parts.append(
                f"* Histórico de compras: {n_ped} pedido(s) | "
                f"Total: {format_brl(total_v)} | "
                f"Ticket médio: {format_brl(ticket)} | "
                f"Última compra: {last_dt or '—'}."
            )
        if classe in ("A", "B", "C"):
            obs_parts.append(f"* Classificação ABC: {classe}.")
        if sit and sit.lower() != "ativo":
            obs_parts.append(f"* Status no ERP: {sit}.")
        obs = " ".join(obs_parts)

        # Características
        caract = []
        if regiao:
            caract.append({"campo": "Região", "conteudo": regiao})
        if classe in ("A", "B", "C"):
            caract.append({"campo": "Classe ABC", "conteudo": f"Classe {classe}"})
        if n_ped > 0:
            caract.append({"campo": "Total de Pedidos", "conteudo": str(n_ped)})
            caract.append({"campo": "Total Comprado", "conteudo": format_brl(total_v)})
        if last_dt:
            caract.append({"campo": "Última Compra", "conteudo": last_dt})
        if ticket > 0:
            caract.append({"campo": "Ticket Médio", "conteudo": format_brl(ticket)})

        # Tags CRM
        crm_tags = []
        if isinstance(tags, list):
            for t in tags:
                tag_val = t.get("tag", "") if isinstance(t, dict) else str(t)
                if tag_val:
                    crm_tags.append({"tag": tag_val})
        if classe in ("A", "B"):
            crm_tags.append({"tag": f"ABC-{classe}"})
        crm_tags.append({"tag": "Importado ERP"})

        # Monta payload Conta
        conta_payload = {
            "identificacao": {
                "cCodInt":      codint,
                "cNome":        nome[:60],
                "cNomeFantasia": fant[:60] if fant else "",
                "cDoc":         doc,
                "cObs":         obs[:2000],
                "dDtReg":       dt_inc or hoje_str,
                "nCodVert":     nCodVert,
            },
            "endereco": {
                "cEndereco": end[:80],
                "cBairro":   bairro[:60],
                "cCidade":   cidade[:60],
                "cUF":       estado[:2] if len(estado) == 2 else "",
                "cCEP":      cep.replace("-", "").replace(".", "")[:8],
                "cPais":     "Brasil",
                "cCompl":    "",
            },
            "telefone_email": {
                "cDDDTel":  ddd_tel[:2],
                "cNumTel":  num_tel[:20],
                "cEmail":   email[:100],
                "cWebsite": "",
                "cDDDFax":  "",
                "cNumFax":  "",
            },
            "informacoesAdicionais": {
                "nFaixaFat": "0",
                "nNumFunc":  0,
            },
            "caracteristicas": caract,
            "tags": crm_tags,
        }

        # Chama UpsertConta
        result = omie_call("crm/contas", "UpsertConta", conta_payload)

        if "faultcode" in result:
            fault = result.get("faultstring", "")
            # "ja existe conta com o nome" = conta importada anteriormente com cCodInt vazio
            # Nao criar duplicata — apenas pular e contar como "ja existe"
            if "cNome" in fault or "nome" in fault.lower():
                # Conta ja existe no CRM com nome identico mas cCodInt diferente
                # Deixa como esta — nao duplica
                stats_err += 1
                if idx < 5 or idx % 200 == 0:
                    print(f"   [JA EXISTE {idx+1}/{total}] {nome[:40]}")
            else:
                stats_err += 1
                if idx < 5 or idx % 200 == 0:
                    print(f"   [ERRO {idx+1}/{total}] {nome[:40]} -> {fault[:80]}")
        else:
            stats_ok += 1
            ncod = result.get("nCod") or result.get("codigo_conta_omie")
            if ncod:
                nCod_map[cid] = ncod
            # Marca para oportunidade se ABC-A ou ABC-B e tiver pedido
            if classe in ("A", "B") and n_ped > 0:
                opp_targets.append({
                    "pn": pn, "stats": s, "classe": classe,
                    "nCodConta": ncod, "codint": codint,
                    "total_v": total_v, "ticket": ticket, "last_dt": last_dt
                })

        # Marca como feito e salva checkpoint a cada 50
        done_contas_set.add(cid)
        if stats_ok % 50 == 0:
            cp["done_contas"]  = list(done_contas_set)
            cp["nCod_map"]     = {str(k): v for k, v in nCod_map.items()}
            save_checkpoint(cp)

        # Log de progresso
        if (idx + 1) % 50 == 0 or idx + 1 == total:
            pct = (idx + 1) / total * 100
            print(f"   [{idx+1:>5}/{total}] {pct:.1f}% | OK: {stats_ok} | Erros: {stats_err}")

    print(f"\n   OK Contas: {stats_ok} criadas/atualizadas | {stats_err} erros")

    # Mapas de solucoes por vertical (verificados via API)
    SOLUCAO_POR_VERTICAL = {
        602540665: 602540621,  # Manutencao -> COMPONENTES ELETROMEC.
        602540656: 602540621,  # Shopping -> COMPONENTES ELETROMEC.
        602540657: 602540621,  # Hospital -> COMPONENTES ELETROMEC.
        602540662: 602540621,  # Turismo -> COMPONENTES ELETROMEC.
        602540670: 602540621,  # Construcao -> COMPONENTES ELETROMEC.
        602540669: 602540620,  # Supermercados -> CENTOPEIS/ROLOS
        602540666: 602540621,  # Varejo -> COMPONENTES ELETROMEC.
        602540654: 602540620,  # Transportes -> CENTOPEIS/ROLOS
    }
    SOLUCAO_DEFAULT = 602540621  # COMPONENTES ELETROMECÂNICOS E ELETRÔNICOS

    # ── 5. Upsert Contatos ────────────────────────────────
    print("\n[5a/5] Criando Contatos no CRM...")
    cont_ok  = 0
    cont_err = 0
    nContato_map = {}  # cid -> nCod do contato (para linkar oportunidades)

    for idx, pn in enumerate(pns_to_process):
        cid   = pn.get("codigo_cliente_omie")
        nome  = (pn.get("razao_social") or "").strip()
        fant  = (pn.get("nome_fantasia") or "").strip()
        email = (pn.get("email") or "").strip().split(";")[0].strip()
        tel   = (pn.get("telefone") or "").strip()
        codint= str(pn.get("codigo_cliente_integracao") or cid or "")

        # Só cria contato se tiver email ou telefone
        if not email and not tel:
            continue

        if cid in done_cont_set:
            continue  # Ja criado no resume

        ncod_conta = nCod_map.get(cid, 0)
        if not ncod_conta:
            continue  # Conta não foi criada, pula

        # DDD / cel
        ddd_cel, num_cel = "", tel
        m = re.match(r"^\(?(\d{2})\)?\s*(.+)$", tel)
        if m:
            ddd_cel = m.group(1)
            num_cel = m.group(2)

        # Nome do contato = primeiro nome da razão social ou nome fantasia
        display = fant or nome
        primeiro, resto = split_nome(display)

        # Cargo genérico baseado em vertical
        nCodVert = detect_vertical(nome, fant)
        cargo_map = {
            602540665: "Gerente de Manutencao",
            602540656: "Gerente de Compras",
            602540657: "Responsavel de Compras",
            602540662: "Gerente de Infraestrutura",
            602540670: "Engenheiro de Obras",
        }
        cargo = cargo_map.get(nCodVert, "Responsavel de Compras")

        contato_payload = {
            "identificacao": {
                "cCodInt":    f"CNT-{codint}",
                "cNome":      primeiro[:60],
                "cSobrenome": (resto or display)[:60],
                "cCargo":     cargo,
                "nCodConta":  ncod_conta,
                "dDtNasc":    "",
            },
            "telefone_email": {
                "cEmail":    email[:100],
                "cDDDCel1":  ddd_cel[:2],
                "cNumCel1":  num_cel[:20],
                "cDDDCel2":  "",
                "cNumCel2":  "",
                "cDDDTel":   "",
                "cNumTel":   "",
                "cDDDFax":   "",
                "cNumFax":   "",
                "cWebsite":  "",
            },
            "cObs": f"Contato importado do ERP Omie. Empresa: {nome[:100]}.",
        }

        result = omie_call("crm/contatos", "UpsertContato", contato_payload)
        if "faultcode" in result:
            cont_err += 1
        else:
            cont_ok += 1
            ncod_cont = result.get("nCod") or result.get("codigo_contato_omie")
            if ncod_cont:
                nContato_map[cid] = ncod_cont

        done_cont_set.add(cid)
        if (cont_ok + cont_err) % 100 == 0:
            cp["done_contatos"]  = list(done_cont_set)
            cp["nContato_map"]   = {str(k): v for k, v in nContato_map.items()}
            save_checkpoint(cp)
            print(f"   Contatos: {cont_ok} OK | {cont_err} erros")

    print(f"   OK Contatos: {cont_ok} criados/atualizados | {cont_err} erros")

    # ── 6. Upsert Oportunidades (ABC-A e ABC-B) ───────────
    if skip_opps:
        print("\n[5b/5] Oportunidades: puladas (--skip-ops)")
    else:
        print(f"\n[5b/5] Criando Oportunidades para {len(opp_targets)} clientes ABC-A/B...")
        opp_ok  = 0
        opp_err = 0

        for idx, item in enumerate(opp_targets):
            if test_limit and idx >= test_limit:
                break

            pn         = item["pn"]
            cid        = pn.get("codigo_cliente_omie")
            nome       = (pn.get("razao_social") or "").strip()
            fant       = (pn.get("nome_fantasia") or "").strip()
            codint     = item["codint"]
            ncod_conta = item.get("nCodConta", 0)
            ncod_cont  = nContato_map.get(cid, 0)
            total_v    = item["total_v"]
            ticket     = item["ticket"]
            last_dt    = item["last_dt"]
            classe     = item["classe"]
            n_ped      = item["stats"]["count"]

            if not ncod_conta or not ncod_cont:
                # Sem contato vinculado, nao conseguimos criar oportunidade
                continue

            nCodVert = detect_vertical(nome, fant)
            solucao_cod = SOLUCAO_POR_VERTICAL.get(nCodVert, SOLUCAO_DEFAULT)

            # Valor estimado = ticket medio * fator ABC
            fator = 1.2 if classe == "A" else 1.0
            valor_opp = round(ticket * fator, 2) if ticket > 0 else 10000.0

            # Fase: A = 05 Negociacao, B = 03 Apresentacao
            fase_cod   = 602540594 if classe == "A" else 602540591
            status_cod = ID_STATUS_CONQ if n_ped >= 3 else ID_STATUS_ATIVO

            desc_opp = (
                f"Cliente {classe} - {n_ped} pedido(s) | "
                f"Total: {format_brl(total_v)} | "
                f"Ultima compra: {last_dt or 'sem data'}"
            )[:200]

            opp_payload = {
                "identificacao": {
                    "cCodIntOp":  f"OPP-{codint}",
                    "cDesOp":     f"Recompra {classe} - {nome[:35]}",
                    "nCodConta":  ncod_conta,
                    "nCodContato": ncod_cont,
                    "nCodSolucao": solucao_cod,
                    "nCodOrigem":  ID_ORIGEM_ERP,
                },
                "fasesStatus": {
                    "nCodFase":   fase_cod,
                    "nCodStatus": status_cod,
                },
            }

            result = omie_call("crm/oportunidades", "UpsertOportunidade", opp_payload)
            if "faultcode" in result:
                opp_err += 1
                if opp_err <= 5:
                    print(f"   [ERRO OPP] {nome[:40]}: {result.get('faultstring','?')[:80]}")
            else:
                opp_ok += 1

            if (opp_ok + opp_err) % 100 == 0:
                print(f"   Oportunidades: {opp_ok} OK | {opp_err} erros")

        print(f"   OK Oportunidades: {opp_ok} criadas | {opp_err} erros")

    # ── Resumo Final ──────────────────────────────────────
    print("\n" + "=" * 60)
    print(" RESUMO FINAL")
    print("=" * 60)
    print(f" PNs processados:     {len(pns_to_process)}")
    print(f" Contas CRM:          {stats_ok} OK | {stats_err} erros")
    print(f" Contatos CRM:        {cont_ok} OK | {cont_err} erros")
    if not skip_opps:
        print(f" Oportunidades CRM:   {opp_ok} OK | {opp_err} erros")
    print(f" ABC-A (top 80% rev): {cnt_a} clientes")
    print(f" ABC-B (próx 15%):    {cnt_b} clientes")
    print(f" ABC-C (rest 5%):     {cnt_c} clientes")
    print(f" Fim: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
