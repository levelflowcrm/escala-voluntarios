import Link from "next/link";
import { redirect } from "next/navigation";
import { fmtDataHora, FUSO } from "@/lib/datas";
import { fmtNum, mediaPorArea, ocupacao, periodoValido, PERIODOS, presentes, resumir, variacao, veiculos, voluntariosManual } from "@/lib/metricas";
import { carregarContexto, carregarFichas } from "@/lib/metricas-dados";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BarrasLista, Colunas, Numero } from "./graficos";

const dm = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" });

export default async function Metricas({ searchParams }: { searchParams: Promise<{ periodo?: string; tipo?: string; serie?: string }> }) {
  const sp = await searchParams;
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");
  const { data: pode } = await supabase.rpc("pode_ver_metricas");
  if (!pode) redirect("/");

  const periodo = periodoValido(sp.periodo);
  const ctx = await carregarContexto(supabase);
  const tipo = ctx.tipos.some((t) => t.id === sp.tipo) ? sp.tipo : undefined;
  const agora = new Date();
  const dia = 86_400_000;
  const limite = new Date(agora.getTime() - periodo * dia);
  const todas = await carregarFichas(supabase, new Date(agora.getTime() - 2 * periodo * dia), new Date(agora.getTime() + 12 * 3_600_000), tipo);
  const fichas = todas.filter((f) => new Date(f.inicio) >= limite);
  const anteriores = todas.filter((f) => new Date(f.inicio) < limite);
  const r = resumir(fichas, ctx.cadeiras);
  const ant = resumir(anteriores, ctx.cadeiras);
  const contados = fichas.filter((f) => f.contado);
  const porArea = mediaPorArea(fichas, ctx.areas);
  const itens = (valor: (f: (typeof fichas)[number]) => number | null, unidade: string) =>
    fichas.map((f) => {
      const v = valor(f);
      return { rotulo: dm.format(new Date(f.inicio)), valor: v, dica: `${f.titulo} · ${fmtDataHora.format(new Date(f.inicio))}: ${v == null ? "não contado" : `${fmtNum(v)} ${unidade}`}` };
    });
  const SERIES = [
    { id: "presentes", nome: "Presentes", unidade: "presentes", valor: (f: (typeof fichas)[number]) => presentes(f, ctx.cadeiras) },
    { id: "online", nome: "Online", unidade: "online", valor: (f: (typeof fichas)[number]) => f.online },
    { id: "sim", nome: "Sim pra Jesus", unidade: "decisões", valor: (f: (typeof fichas)[number]) => f.simPraJesus },
    { id: "voluntarios", nome: "Voluntários", unidade: "voluntários", valor: voluntariosManual },
    { id: "veiculos", nome: "Veículos", unidade: "veículos", valor: veiculos },
  ];
  const serie = SERIES.find((s) => s.id === sp.serie) ?? SERIES[0];
  const href = (o: { serie: string }) => `/metricas?${new URLSearchParams({ periodo: String(periodo), ...(tipo ? { tipo } : {}), serie: o.serie })}`;
  const semFicha = fichas.filter((f) => !f.contado).length;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Métricas dos cultos</h1>
        <p className="text-sm text-neutral-500">Público, voluntários, online, decisões e estacionamento. Presentes = {fmtNum(ctx.cadeiras)} cadeiras menos as vazias da Nave e da Galeria.</p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500">Período</span>
          <select name="periodo" defaultValue={periodo} className="h-10 rounded-lg border border-neutral-300 bg-transparent px-2 dark:border-neutral-700">
            {PERIODOS.map((p) => <option key={p} value={p}>Últimos {p} dias</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500">Tipo de evento</span>
          <select name="tipo" defaultValue={tipo ?? ""} className="h-10 max-w-52 rounded-lg border border-neutral-300 bg-transparent px-2 dark:border-neutral-700">
            <option value="">Todos</option>
            {ctx.tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </label>
        <button className="h-10 rounded-lg bg-blue-600 px-4 font-medium text-white">Aplicar</button>
      </form>

      {fichas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-neutral-500 dark:border-neutral-700">Nenhum evento nesse período.</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Numero destaque rotulo="Presentes · média por culto" valor={fmtNum(r.presentesMedia)} variacao={variacao(r.presentesMedia, ant.presentesMedia)}
              detalhe={r.presentesTotal != null ? `Total: ${fmtNum(r.presentesTotal)} em ${r.cultosComPublico} ${r.cultosComPublico === 1 ? "culto" : "cultos"} · ${fmtNum(r.ocupacaoMedia, 1)}% das cadeiras` : "Conte as cadeiras vazias da Nave e da Galeria"} />
            <Numero rotulo="Online · média por culto" valor={fmtNum(r.onlineMedia)} variacao={variacao(r.onlineMedia, ant.onlineMedia)} detalhe={r.onlineTotal != null ? `Total: ${fmtNum(r.onlineTotal)} · YouTube` : "YouTube"} />
            <Numero rotulo="Sim pra Jesus · total" valor={fmtNum(r.simPraJesusTotal)} variacao={variacao(r.simPraJesusTotal, ant.simPraJesusTotal)} detalhe="Decisões no apelo, no período" />
            <Numero rotulo="Visitantes · total" valor={fmtNum(r.visitantesTotal)} variacao={variacao(r.visitantesTotal, ant.visitantesTotal)} detalhe="No período" />
            <Numero rotulo="Voluntários · média por culto" valor={fmtNum(r.voluntariosManualMedia, 1)} variacao={variacao(r.voluntariosManualMedia, ant.voluntariosManualMedia)}
              detalhe={<>Manual · auto (Cheguei): {fmtNum(r.voluntariosAutoMedia, 1)}{r.voluntariosPor100 != null && <> · {fmtNum(r.voluntariosPor100, 1)} por 100 presentes</>}</>} />
            <Numero rotulo="Estacionamento · média" valor={`${fmtNum(r.carrosMedia)} 🚗`} detalhe={`${fmtNum(r.motosMedia)} 🏍️ motos`} />
          </section>
          <p className="-mt-3 text-xs text-neutral-500">Média = soma dividida pelos cultos que foram contados, para comparar períodos com quantidades diferentes de cultos. Sim pra Jesus e visitantes aparecem como total.</p>

          {semFicha > 0 && (
            <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              ⚠️ {semFicha} {semFicha === 1 ? "evento ainda sem contagem lançada" : "eventos ainda sem contagem lançada"}. Eles não entram nas médias.
            </p>
          )}

          <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex flex-wrap gap-2 text-sm">
              {SERIES.map((s) => (
                <Link key={s.id} href={href({ serie: s.id })} className={`rounded-full px-3 py-1 ${s.id === serie.id ? "bg-blue-600 text-white" : "border border-neutral-300 dark:border-neutral-700"}`}>{s.nome}</Link>
              ))}
            </div>
            <Colunas titulo={`${serie.nome} por culto`} itens={itens(serie.valor, serie.unidade)} referencia={serie.id === "presentes" ? { valor: ctx.cadeiras, rotulo: `${fmtNum(ctx.cadeiras)} cadeiras` } : undefined} />
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
            <h2 className="font-medium">Voluntários por área (média por culto)</h2>
            <BarrasLista linhas={porArea.map((a) => ({ nome: a.nome, valor: a.media, texto: a.media == null ? "–" : fmtNum(a.media, 1) }))} />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-medium">Eventos do período</h2>
            <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full min-w-[30rem] text-sm">
                <thead className="text-left text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="p-3">Evento</th>
                    <th className="p-3 text-right">Presentes</th>
                    <th className="p-3 text-right">Voluntários<br /><span className="font-normal normal-case">manual · auto</span></th>
                    <th className="p-3 text-right">Online</th>
                    <th className="p-3 text-right">Sim</th>
                  </tr>
                </thead>
                <tbody>
                  {[...fichas].reverse().map((f) => {
                    const p = presentes(f, ctx.cadeiras);
                    return (
                      <tr key={f.id} className="border-t border-neutral-200 dark:border-neutral-800">
                        <td className="p-3"><Link href={`/metricas/${f.id}`} className="underline">{f.titulo}</Link><br /><span className="text-xs capitalize text-neutral-500">{fmtDataHora.format(new Date(f.inicio))}{f.contado ? "" : " · sem contagem"}</span></td>
                        <td className="p-3 text-right tabular-nums">{fmtNum(p)}{p != null && <span className="block text-xs text-neutral-500">{fmtNum(ocupacao(p, ctx.cadeiras), 1)}%</span>}</td>
                        <td className="p-3 text-right tabular-nums">{fmtNum(voluntariosManual(f))} <span className="text-neutral-400">·</span> {fmtNum(f.autoPresentes)}</td>
                        <td className="p-3 text-right tabular-nums">{fmtNum(f.online)}</td>
                        <td className="p-3 text-right tabular-nums">{fmtNum(f.simPraJesus)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-neutral-500">{contados.length} de {fichas.length} eventos com contagem. Toque no evento para lançar ou corrigir.</p>
          </section>
        </>
      )}
    </main>
  );
}
