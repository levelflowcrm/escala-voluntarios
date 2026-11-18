import Link from "next/link";
import { redirect } from "next/navigation";
import { BotaoAgenda } from "../botao-agenda";
import { fmtMes, limitesMes, primeiraMaiuscula, mesAtual, mesValido, somarMes } from "@/lib/datas";
import { corDoEvento, CORES } from "@/lib/cores-evento";
import { criarClienteServidor } from "@/lib/supabase/server";

type Linha = {
  id: string;
  papel: string;
  status: "pendente" | "confirmado";
  eventos: { titulo: string; inicio: string; cor: string | null; tipo_agenda: string | null };
  funcoes: { nome: string } | null;
  ministerios: { nome: string } | null;
};

const FUSO = "America/Sao_Paulo";
const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long", day: "2-digit", month: "2-digit" });
const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const diaDe = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date(iso));
const PAPEL: Record<string, string> = { titular: "", apoio: "apoio", treinamento: "treinamento", responsavel_dia: "responsável do dia" };

export default async function MinhasEscalas({ searchParams }: { searchParams: Promise<{ mes?: string; ver?: string }> }) {
  const params = await searchParams;
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const proximas = params.ver === "proximas";
  const mes = mesValido(params.mes) ? params.mes : mesAtual();
  const { inicio, fim } = limitesMes(mes);

  let consulta = supabase
    .from("escalas")
    .select("id, papel, status, funcoes(nome), ministerios(nome), eventos!inner(titulo, inicio, cor, tipo_agenda)")
    .eq("pessoa_id", eu)
    .in("status", ["pendente", "confirmado"])
    .order("inicio", { referencedTable: "eventos" });
  consulta = proximas
    ? consulta.gte("eventos.inicio", new Date().toISOString()).limit(60)
    : consulta.gte("eventos.inicio", inicio).lt("eventos.inicio", fim);
  const lista = ((await consulta).data ?? []) as unknown as Linha[];
  lista.sort((a, b) => +new Date(a.eventos.inicio) - +new Date(b.eventos.inicio));

  const dias = new Map<string, Linha[]>();
  for (const l of lista) dias.set(diaDe(l.eventos.inicio), [...(dias.get(diaDe(l.eventos.inicio)) ?? []), l]);

  const nomeMes = fmtMes.format(new Date(`${mes}-15T12:00:00-03:00`));
  const aba = (ativa: boolean) =>
    `flex h-10 flex-1 items-center justify-center rounded-xl border text-sm font-medium ${
      ativa ? "border-violet-600 bg-violet-600 text-white" : "border-neutral-300 dark:border-neutral-700"
    }`;
  const setaMes = (m: string) => `/minhas-escalas?mes=${m}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Minhas escalas</h1>

      <div className="flex gap-2">
        <Link href={`/minhas-escalas?mes=${mesAtual()}`} className={aba(!proximas)}>Por mês</Link>
        <Link href="/minhas-escalas?ver=proximas" className={aba(proximas)}>Próximas</Link>
      </div>

      {!proximas && (
        <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-2 dark:border-neutral-800">
          <Link href={setaMes(somarMes(mes, -1))} className="px-3 py-2 text-lg" aria-label="Mês anterior">‹</Link>
          <span className="font-medium">{primeiraMaiuscula(nomeMes)}</span>
          <Link href={setaMes(somarMes(mes, 1))} className="px-3 py-2 text-lg" aria-label="Próximo mês">›</Link>
        </div>
      )}

      <p className="text-sm text-neutral-500">
        {lista.length === 0
          ? proximas ? "Você não tem escalas marcadas pelos próximos dias." : "Você não serve em nenhum dia deste mês."
          : proximas
            ? `${lista.length} ${lista.length === 1 ? "escala" : "escalas"} pela frente.`
            : `Você serve em ${dias.size} ${dias.size === 1 ? "dia" : "dias"} neste mês (${lista.length} ${lista.length === 1 ? "escala" : "escalas"}).`}
      </p>

      {[...dias.entries()].map(([dia, escalas]) => (
        <section key={dia} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">{primeiraMaiuscula(fmtDia.format(new Date(escalas[0].eventos.inicio)).replace(/-feira/, ""))}</h2>
          {escalas.map((l) => {
            const cor = corDoEvento(l.eventos.tipo_agenda, l.eventos.cor);
            const papel = PAPEL[l.papel];
            return (
              <article key={l.id} className="flex overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                <div className={`flex w-20 shrink-0 items-center justify-center text-lg font-semibold ${cor ? CORES[cor].card : "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200"}`}>
                  {fmtHora.format(new Date(l.eventos.inicio))}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className="font-medium">{l.eventos.titulo}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    {l.papel === "responsavel_dia" ? "Responsável do dia" : (l.funcoes?.nome ?? "Escalado")}
                    {l.ministerios && ` · ${l.ministerios.nome}`}
                    {papel && l.papel !== "responsavel_dia" && ` (${papel})`}
                  </p>
                  {l.status === "confirmado" ? (
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">✓ Presença confirmada</p>
                  ) : (
                    <Link href="/" className="text-xs font-medium text-amber-700 underline dark:text-amber-400">⏳ Falta confirmar. Responder na tela inicial</Link>
                  )}
                  <div className="mt-1 text-xs">
                    <BotaoAgenda
                      titulo={`Servir: ${l.eventos.titulo}${l.funcoes ? ` · ${l.funcoes.nome}` : ""}`}
                      inicio={l.eventos.inicio}
                      descricao={[l.ministerios && `Ministério: ${l.ministerios.nome}`, l.funcoes && `Função: ${l.funcoes.nome}`, "Escala pelo Mais Conectados"].filter(Boolean).join("\n")}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </main>
  );
}
