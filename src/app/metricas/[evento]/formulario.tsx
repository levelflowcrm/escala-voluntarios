"use client";

import { useState, useTransition } from "react";
import { fmtNum, lerNumero, ocupacao, presentes } from "@/lib/metricas";
import { salvarMetricas } from "../acoes";

type Inicial = {
  online: number | null; visitantes: number | null; simPraJesus: number | null;
  naveVazias: number | null; galeriaVazias: number | null; carros: number | null; motos: number | null;
  areas: Record<string, number>;
};

const txt = (n: number | null | undefined) => (n == null ? "" : String(n));

function Campo({ rotulo, dica, valor, aoMudar, erro }: { rotulo: string; dica?: string; valor: string; aoMudar: (v: string) => void; erro?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{rotulo}</span>
      <input
        inputMode="numeric" value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder="–"
        className={`h-12 rounded-xl border bg-transparent px-3 text-lg tabular-nums ${erro ? "border-rose-500" : "border-neutral-300 dark:border-neutral-700"}`}
      />
      {dica && <span className="text-xs text-neutral-500">{dica}</span>}
    </label>
  );
}

export function FormularioMetricas({ evento, areas, inicial, cadeiras, auto }: {
  evento: string; areas: { id: string; nome: string }[]; inicial: Inicial; cadeiras: number;
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

  function salvar() {
    setMsg(null);
    if (temErro) return setMsg({ ok: false, texto: passou ? `As cadeiras vazias passam do total (${fmtNum(cadeiras)}).` : "Confira os números: só dígitos, sem vírgula." });
    iniciar(async () => {
      const [online, visitantes, sim, , , carros, motos] = campos;
      const r = await salvarMetricas(evento, {
        online: online.valor, visitantes: visitantes.valor, simPraJesus: sim.valor, naveVazias: nave.valor, galeriaVazias: galeria.valor,
        carros: carros.valor, motos: motos.valor, areas: areasNum.map((a) => ({ areaId: a.id, qtd: a.valor })),
      });
      setMsg(r.erro ? { ok: false, texto: r.erro } : { ok: true, texto: "Contagem salva." });
    });
  }

  const set = (k: keyof typeof v) => (x: string) => setV((o) => ({ ...o, [k]: x }));
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">Público presente</h2>
        <p className="text-xs text-neutral-500">Conte as cadeiras vazias de cada setor. Deixe em branco o que ainda não contou.</p>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Nave: vazias" valor={v.nave} aoMudar={set("nave")} erro={nave.erro} />
          <Campo rotulo="Galeria: vazias" valor={v.galeria} aoMudar={set("galeria")} erro={galeria.erro} />
        </div>
        <div className="rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-950/30">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Presentes</p>
          <p className="text-3xl font-semibold tabular-nums">{fmtNum(pres)}</p>
          <p className="text-xs text-neutral-500">{pres == null ? "Preencha Nave e Galeria" : `${fmtNum(cadeiras)} cadeiras − ${fmtNum(nave.valor)} − ${fmtNum(galeria.valor)} · ${fmtNum(ocupacao(pres, cadeiras), 1)}% de ocupação`}</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">Voluntários por área</h2>
        <div className="grid grid-cols-2 gap-3">
          {areas.map((a) => (
            <Campo key={a.id} rotulo={a.nome} valor={qtdAreas[a.id] ?? ""} aoMudar={(x) => setQtdAreas((o) => ({ ...o, [a.id]: x }))} erro={areasNum.find((z) => z.id === a.id)?.erro} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-950/30">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Contagem manual</p>
            <p className="text-3xl font-semibold tabular-nums">{fmtNum(manual)}</p>
          </div>
          <div className="rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-900">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Contagem auto</p>
            <p className="text-3xl font-semibold tabular-nums">{fmtNum(auto.presentes)}</p>
            <p className="text-xs text-neutral-500">{auto.escalados == null ? "Sem escalados" : `apertaram Cheguei, de ${fmtNum(auto.escalados)} escalados`}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="col-span-2 font-medium">Outras contagens</h2>
        <Campo rotulo="Online (YouTube)" valor={v.online} aoMudar={set("online")} erro={campos[0].erro} />
        <Campo rotulo="Visitantes" valor={v.visitantes} aoMudar={set("visitantes")} erro={campos[1].erro} />
        <Campo rotulo="Sim pra Jesus" dica="Decisões no apelo" valor={v.sim} aoMudar={set("sim")} erro={campos[2].erro} />
        <span />
        <Campo rotulo="Carros" valor={v.carros} aoMudar={set("carros")} erro={campos[5].erro} />
        <Campo rotulo="Motos" valor={v.motos} aoMudar={set("motos")} erro={campos[6].erro} />
      </section>

      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>{msg.texto}</p>}
      <button onClick={salvar} disabled={ocupado} className="h-12 rounded-xl bg-blue-600 font-medium text-white disabled:opacity-60">{ocupado ? "Salvando…" : "Salvar contagem"}</button>
    </div>
  );
}
