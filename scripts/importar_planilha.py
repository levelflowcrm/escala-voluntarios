"""
Importa a planilha "Escala Backstage" para o banco (gera supabase/seed.sql).

Uso:
    python3 -I scripts/importar_planilha.py caminho/Escala_Backstage_2026.xlsx

Como a planilha é lida
----------------------
* Abas mensais (ex.: "Out-26"): cada dia é um bloco que começa com a data na
  coluna A e traz até dois eventos. Cada evento ocupa 2 linhas:
    - linha do nome: titulares de cada função;
    - linha do horário: "apoio" (acompanhante de treinamento ou reforço).
* Colunas da Transmissão: F = DTV-Transmissão, H = Câm. Black,
  J = Câm. Grua, L = Câm. Móvel, N = Treinamento.
* Mesmo nome em 2+ funções na linha do nome = "responsável do dia".
* "Todos" = convocação geral (reunião / alinhamento).
* Aba "Controle Eventos e Volunt.": tipos de evento (coluna A) e listas de
  voluntários: D = Iluminação, E = Projeção, I = DTV-Transmissão.

O script é determinístico (UUIDs derivados dos nomes), então pode ser rodado
de novo sem duplicar nada.
"""

from __future__ import annotations

import datetime as dt
import re
import sys
import uuid
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl

NS = uuid.UUID("7d5c1a52-4b8e-4f0e-9a51-6f1d3c2b9e10")
IGREJA_SLUG = "nasci-pra-deus"
IGREJA_NOME = "Igreja Nasci Pra Deus"

# Grafias diferentes da mesma pessoa na planilha -> nome oficial
NOMES_UNIFICADOS = {
    "Marco": "Marcos",
    "Márcio Conti": "Márcio",
}
COORDENADOR_TRANSMISSAO = "Luciano"

FUNCOES_TRANSMISSAO = {  # coluna -> (nome, ordem)
    "F": ("DTV-Transmissão", 1),
    "H": ("Câmera Black", 2),
    "J": ("Câmera Grua", 3),
    "L": ("Câmera Móvel", 4),
}
COL_TREINAMENTO = "N"
ABAS_MENSAIS = ["Jul-26", "Ago-26", "Set-26", "Out-26"]
IGNORAR = {"todos", "à definir", "a definir", ""}

# Cultos fixos: nome -> (dia_semana 0=dom, hora)
RECORRENTES = {
    "Encontro de Vida - Qrta": (3, "19:30"),
    "Encontro de Vida - Dmg Manhã": (0, "09:00"),
    "Encontro de Vida - Dmg Noite": (0, "18:30"),
}
NAO_EVENTOS = {"SEM PROGRAMAÇÃO", "LINK EM BREVE"}


def uid(*partes: str) -> str:
    return str(uuid.uuid5(NS, "|".join(partes)))


def q(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    return "'" + str(v).replace("'", "''") + "'"


def limpar(v) -> str:
    texto = str(v).strip() if v is not None else ""
    return NOMES_UNIFICADOS.get(texto, texto)


def hora_de(v) -> str | None:
    if isinstance(v, dt.time):
        return v.strftime("%H:%M")
    if isinstance(v, dt.datetime):
        return v.strftime("%H:%M")
    if isinstance(v, str):
        m = re.search(r"(\d{1,2})(?:[:h](\d{2}))?", v)
        if m:
            return f"{int(m.group(1)):02d}:{m.group(2) or '00'}"
    return None


def main(caminho: str) -> None:
    wb = openpyxl.load_workbook(caminho, data_only=True)
    sql: list[str] = []
    avisos: list[str] = []

    igreja = uid("igreja", IGREJA_SLUG)
    min_ids = {n: uid("ministerio", n) for n in ("Transmissão", "Projeção", "Iluminação")}
    func_ids = {c: uid("funcao", "Transmissão", n) for c, (n, _) in FUNCOES_TRANSMISSAO.items()}

    # ------------------------------------------------------------- controle
    ctrl = wb["Controle Eventos e Volunt."]
    tipos = []
    for (v,) in ctrl.iter_rows(min_row=2, min_col=1, max_col=1, values_only=True):
        nome = limpar(v)
        if nome and nome not in NAO_EVENTOS and nome not in tipos:
            tipos.append(nome)

    membros: dict[str, set[str]] = defaultdict(set)  # pessoa -> ministérios
    for col, ministerio in (("D", "Iluminação"), ("E", "Projeção"), ("I", "Transmissão")):
        for r in range(2, ctrl.max_row + 1):
            nome = limpar(ctrl[f"{col}{r}"].value)
            if nome.lower() not in IGNORAR:
                membros[nome].add(ministerio)

    # ------------------------------------------------------------- eventos
    eventos = []  # dicts
    for aba in ABAS_MENSAIS:
        ws = wb[aba]
        r = 3
        dia = None
        while r <= ws.max_row:
            a = ws[f"A{r}"].value
            if isinstance(a, dt.datetime):
                dia = a.date()
                r += 1
                continue
            titulo = limpar(a)
            if dia and titulo and not isinstance(a, (dt.time,)) and titulo not in NAO_EVENTOS:
                hora = hora_de(ws[f"A{r+1}"].value) or "19:00"
                ev = {"aba": aba, "dia": dia, "hora": hora, "titulo": titulo,
                      "titulares": {}, "apoios": {}, "treinamento": set(), "todos": False}
                for col in list(FUNCOES_TRANSMISSAO) + [COL_TREINAMENTO]:
                    for linha, alvo in ((r, "titulares"), (r + 1, "apoios")):
                        nome = limpar(ws[f"{col}{linha}"].value)
                        if not nome:
                            continue
                        if nome.lower() == "todos":
                            ev["todos"] = True
                        elif nome.lower() in IGNORAR:
                            continue
                        elif col == COL_TREINAMENTO:
                            ev["treinamento"].add(nome)
                        else:
                            ev[alvo][col] = nome
                eventos.append(ev)
                r += 2
                continue
            r += 1

    # ------------------------------------------------------------- análise
    pessoas_vistas: set[str] = set(membros)
    feitas: dict[str, Counter] = defaultdict(Counter)
    responsaveis: set[str] = set()
    for ev in eventos:
        nomes = list(ev["titulares"].values())
        cont = Counter(nomes)
        resp = [n for n, c in cont.items() if c >= 2]
        ev["responsavel"] = resp[0] if resp else None
        if ev["responsavel"]:
            responsaveis.add(ev["responsavel"])
        for col, n in ev["titulares"].items():
            pessoas_vistas.add(n)
            membros[n].add("Transmissão")
            if n != ev["responsavel"]:
                feitas[n][col] += 1
        for n in list(ev["apoios"].values()) + list(ev["treinamento"]):
            pessoas_vistas.add(n)
            membros[n].add("Transmissão")

    # Possíveis nomes duplicados (ex.: "Marco" x "Marcos")
    nomes = sorted(pessoas_vistas)
    for i, a in enumerate(nomes):
        for b in nomes[i + 1:]:
            if b.startswith(a) or (a.rstrip("s") == b.rstrip("s")):
                avisos.append(f"Verificar se são a mesma pessoa: '{a}' e '{b}'")

    # ------------------------------------------------------------- SQL
    sql.append("-- Gerado por scripts/importar_planilha.py — não edite à mão.")
    sql.append("begin;")
    sql.append(f"insert into igrejas (id, nome, slug) values ({q(igreja)}, {q(IGREJA_NOME)}, {q(IGREJA_SLUG)}) on conflict do nothing;")
    cores = {"Transmissão": "#7c3aed", "Projeção": "#0891b2", "Iluminação": "#d97706"}
    for nome, mid in min_ids.items():
        sql.append(f"insert into ministerios (id, igreja_id, nome, cor) values ({q(mid)}, {q(igreja)}, {q(nome)}, {q(cores[nome])}) on conflict do nothing;")
    for col, (nome, ordem) in FUNCOES_TRANSMISSAO.items():
        sql.append(f"insert into funcoes (id, ministerio_id, nome, ordem) values ({q(func_ids[col])}, {q(min_ids['Transmissão'])}, {q(nome)}, {ordem}) on conflict do nothing;")

    for nome in tipos:
        dia_sem, hora = RECORRENTES.get(nome, (None, None))
        sql.append(
            f"insert into tipos_evento (id, igreja_id, nome, dia_semana, hora) values "
            f"({q(uid('tipo', nome))}, {q(igreja)}, {q(nome)}, {q(dia_sem) if dia_sem is not None else 'null'}, {q(hora)}) on conflict do nothing;"
        )

    pid = {n: uid("pessoa", n) for n in nomes}
    for n in nomes:
        sql.append(f"insert into pessoas (id, igreja_id, nome) values ({q(pid[n])}, {q(igreja)}, {q(n)}) on conflict do nothing;")
        for m in sorted(membros[n]):
            papel = "coordenador" if (m == "Transmissão" and n == COORDENADOR_TRANSMISSAO) else "voluntario"
            pode = m == "Transmissão" and n in responsaveis
            sql.append(
                f"insert into membros_ministerio (pessoa_id, ministerio_id, papel, pode_responsavel_dia) values "
                f"({q(pid[n])}, {q(min_ids[m])}, {q(papel)}, {q(pode)}) on conflict do nothing;"
            )
        for col in FUNCOES_TRANSMISSAO:
            if feitas[n][col] or n in responsaveis:
                sql.append(f"insert into habilitacoes (pessoa_id, funcao_id, nivel) values ({q(pid[n])}, {q(func_ids[col])}, 'apto') on conflict do nothing;")

    hoje = dt.date.today()
    tm = min_ids["Transmissão"]
    repeticao: Counter = Counter()
    for ev in eventos:
        chave = (ev["dia"].isoformat(), ev["hora"], ev["titulo"])
        repeticao[chave] += 1
        eid = uid("evento", *chave, str(repeticao[chave]))
        inicio = f"{ev['dia'].isoformat()} {ev['hora']}:00-03"
        obs = ("Treinamento: " + ", ".join(sorted(ev["treinamento"]))) if ev["treinamento"] else None
        tipo = uid("tipo", ev["titulo"]) if ev["titulo"] in tipos else None
        sql.append(
            f"insert into eventos (id, igreja_id, tipo_evento_id, titulo, inicio, observacao, convocacao_geral) values "
            f"({q(eid)}, {q(igreja)}, {q(tipo)}, {q(ev['titulo'])}, {q(inicio)}, {q(obs)}, {q(ev['todos'])}) on conflict do nothing;"
        )
        tem_escala = ev["titulares"] or ev["apoios"]
        if tem_escala:
            sql.append(f"insert into escalas_ministerio (evento_id, ministerio_id, publicada, publicada_em) values ({q(eid)}, {q(tm)}, true, now()) on conflict do nothing;")
        status = "confirmado" if ev["dia"] < hoje else "pendente"
        usados: set[str] = set()

        def add(nome, col, papel):
            if nome in usados:
                avisos.append(f"{ev['dia']} {ev['titulo']}: '{nome}' aparece duas vezes; mantida só a 1ª")
                return
            usados.add(nome)
            fid = func_ids[col] if col else None
            sql.append(
                f"insert into escalas (id, evento_id, ministerio_id, funcao_id, pessoa_id, papel, status) values "
                f"({q(uid('escala', eid, nome))}, {q(eid)}, {q(tm)}, {q(fid)}, {q(pid[nome])}, {q(papel)}, {q(status)}) on conflict do nothing;"
            )

        if ev["responsavel"]:
            add(ev["responsavel"], None, "responsavel_dia")
        for col, nome in ev["titulares"].items():
            if nome != ev["responsavel"]:
                if ev["responsavel"]:
                    avisos.append(f"{ev['dia']} {ev['titulo']}: responsável do dia ({ev['responsavel']}) com '{nome}' em outra função — importado como apoio")
                    add(nome, col, "apoio")
                else:
                    add(nome, col, "titular")
        for col, nome in ev["apoios"].items():
            add(nome, col, "treinamento" if nome in ev["treinamento"] else "apoio")

    sql.append("commit;")
    saida = Path(__file__).resolve().parent.parent / "supabase" / "seed.sql"
    saida.write_text("\n".join(sql) + "\n", encoding="utf-8")

    total_escalas = sum(1 for s in sql if s.startswith("insert into escalas ("))
    print(f"Pessoas: {len(nomes)} | Eventos: {len(eventos)} | Escalações: {total_escalas} | Tipos de evento: {len(tipos)}")
    print(f"Responsáveis do dia: {', '.join(sorted(responsaveis)) or '-'}")
    print(f"Arquivo gerado: {saida}")
    for a in dict.fromkeys(avisos):
        print("AVISO:", a)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
