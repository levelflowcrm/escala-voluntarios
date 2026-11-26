"use client";

import { useState, useTransition } from "react";
import { fmtNum, lerNumero, ocupacao, presentes } from "@/lib/metricas";
import Link from "next/link";
import { fmtDataHora } from "@/lib/datas";
import { salvarMetricas } from "../acoes";
import { enviarRelatorio } from "../relatorio-acoes";

type Inicial = {
  online: number | null; visitantes: number | null; simPraJesus: number | null;
  naveVazias: number | null; galeriaVazias: number | null; carros: number | null; motos: number | null;
  areas: Record<string, number>;
};

const txt = (n: number | null | undefined) => (n == null ? "" : String(n));

function Campo({ rotulo, valor, aoMudar, erro }: { rotulo: string; valor: string; aoMudar: (v: string) => void; erro?: boolean }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
      <span className="truncate">{rotulo}</span>
      <input
        inputMode="numeric" value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder="–"
        className={`h-11 w-full rounded-lg border bg-transparent px-2 text-base font-normal tabular-nums text-inherit ${erro ? "border-rose-500" : "border-neutral-300 dark:border-neutral-700"}`}
      />
    </label>
  );
}

export function FormularioMetricas({ evento, areas, inicial, cadeiras, auto, relatorio }: {
  evento: string; areas: { id: string; nome: string }[]; inicial: Inicial; cadeiras: number;
  relatorio: { destinatarios: number; ultimo: { em: string; destinatarios: number } | null };
  auto: { escalados: number | null; presentes: number | null };
}) {
  const [v, setV] = useState({
    online: txt(inicial.online), visitantes: txt(inicial.visitantes), sim: txt(inicial.simPraJesus),
    nave: txt(inicial.naveVazias), galeria: txt(inicial.galeriaVazias), carros: txt(inicial.carros), motos: txt(inicial.motos),
  });
  const [qtdAreas, setQtdAreas] = useState<Record<string, string>>(Object.fromEntries(areas.map((a) => [a.id, txt(inicial.areas[a.id])])));
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, iniciar] = useTransition();

  const num = (s: string) => lerNumero(s);
  const nave = num(v.nave), galeria = num(v.galeria);
  const pres = presentes({ naveVazias: nave.valor, galeriaVazias: galeria.valor }, cadeiras);
  const passou = (nave.valor ?? 0) + (galeria.valor ?? 0) > cadeiras;
  const areasNum = areas.map((a) => ({ id: a.id, ...num(qtdAreas[a.id] ?? "") }));
  const manual = areasNum.some((a) => a.valor != null) ? areasNum.reduce((s, a) => s + (a.valor ?? 0), 0) : null;
  const campos = [v.online, v.visitantes, v.sim, v.nave, v.galeria, v.carros, v.motos].map(num);
  const temErro = campos.some((c) => c.erro) || areasNum.some((a) => a.erro) || passou;

  function salvar(enviar = false) {
    setMsg(null);
    if (temErro) return setMsg({ ok: false, texto: passou ? `As cadeiras vazias passam do total (${fmtNum(cadeiras)}).` : "Confira os números: só dígitos, sem vírgula." });
    iniciar(async () => {
      const [online, visitantes, sim, , , carros, motos] = campos;
      const r = await salvarMetricas(evento, {
        online: online.valor, visitantes: visitantes.valor, simPraJesus: sim.valor, naveVazias: nave.valor, galeriaVazias: galeria.valor,
        carros: carros.valor, motos: motos.valor, areas: areasNum.map((a) => ({ areaId: a.id, qtd: a.valor })),
      });
      if (r.erro) return setMsg({ ok: false, texto: r.erro });
      if (!enviar) return setMsg({ ok: true, texto: "Contagem salva." });
      const e = await enviarRelatorio(evento);
      if (e.erro) return setMsg({ ok: false, texto: `Contagem salva, mas o relatório não foi enviado: ${e.erro}` });
      const quem = `${e.enviados} ${e.enviados === 1 ? "pessoa" : "pessoas"}`;
      setMsg({ ok: true, texto: `Contagem salva e relatório enviado para ${quem}.${e.falhas ? ` Falhou para ${e.falhas}.` : ""}${e.semAnalise ? " A análise da IA não ficou disponível desta vez." : ""}` });
    });
  }

  const set = (k: keyof typeof v) => (x: string) => setV((o) => ({ ...o, [k]: x }));
  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
        <h2 className="text-sm font-semibold">Cadeiras vazias</h2>
        <div className="grid grid-cols-3 items-end gap-2">
          <Campo rotulo="Nave" valor={v.nave} aoMudar={set("nave")} erro={nave.erro} />
          <Campo rotulo="Galeria" valor={v.galeria} aoMudar={set("galeria")} erro={galeria.erro} />
          <div className="flex h-11 flex-col justify-center rounded-lg bg-blue-50 px-2 dark:bg-blue-950/30">
            <span className="text-[10px] uppercase leading-none text-neutral-500">Presentes</span>
            <span className="text-lg font-semibold leading-tight tabular-nums">{fmtNum(pres)}</span>
          </div>
        </div>
        {pres != null && <p className="text-xs text-neutral-500">{fmtNum(cadeiras)} − {fmtNum(nave.valor)} − {fmtNum(galeria.valor)} · {fmtNum(ocupacao(pres, cadeiras), 1)}% de ocupação</p>}
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Voluntários por área</h2>
          <p className="text-xs text-neutral-500">Manual <strong className="text-base tabular-nums text-inherit">{fmtNum(manual)}</strong> · Auto <strong className="text-base tabular-nums text-inherit">{fmtNum(auto.presentes)}</strong>{auto.escalados != null && <span> de {fmtNum(auto.escalados)}</span>}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {areas.map((a) => (
            <Campo key={a.id} rotulo={a.nome} valor={qtdAreas[a.id] ?? ""} aoMudar={(x) => setQtdAreas((o) => ({ ...o, [a.id]: x }))} erro={areasNum.find((z) => z.id === a.id)?.erro} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
        <h2 className="text-sm font-semibold">Outras contagens</h2>
        <div className="grid grid-cols-3 gap-2">
          <Campo rotulo="Online" valor={v.online} aoMudar={set("online")} erro={campos[0].erro} />
          <Campo rotulo="Visitantes" valor={v.visitantes} aoMudar={set("visitantes")} erro={campos[1].erro} />
          <Campo rotulo="Sim pra Jesus" valor={v.sim} aoMudar={set("sim")} erro={campos[2].erro} />
          <Campo rotulo="Carros" valor={v.carros} aoMudar={set("carros")} erro={campos[5].erro} />
          <Campo rotulo="Motos" valor={v.motos} aoMudar={set("motos")} erro={campos[6].erro} />
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 bg-white/95 px-4 pb-4 pt-2 backdrop-blur dark:bg-black/90">
        {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>{msg.texto}</p>}
        <button onClick={() => salvar(false)} disabled={ocupado} className="h-12 rounded-xl border border-blue-600 font-medium text-blue-700 disabled:opacity-60 dark:text-blue-300">{ocupado ? "Aguarde…" : "Salvar contagem"}</button>
        <button onClick={() => salvar(true)} disabled={ocupado || relatorio.destinatarios === 0} className="h-12 rounded-xl bg-blue-600 font-medium text-white disabled:opacity-60">{ocupado ? "Gerando e enviando…" : relatorio.ultimo ? "Salvar e reenviar relatório" : "Salvar e enviar relatório"}</button>
        <p className="text-xs text-neutral-500">
          {relatorio.ultimo && <>Último envio: {fmtDataHora.format(new Date(relatorio.ultimo.em))} para {relatorio.ultimo.destinatarios} {relatorio.ultimo.destinatarios === 1 ? "pessoa" : "pessoas"}. </>}
          <Link href="/metricas/destinatarios" className="underline">{relatorio.destinatarios === 0 ? "Cadastre quem recebe o relatório" : `Quem recebe (${relatorio.destinatarios})`}</Link>
        </p>
      </div>
    </div>
  );
}
