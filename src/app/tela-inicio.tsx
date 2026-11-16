import Link from "next/link";
import { CORES } from "@/lib/cores-evento";
import { diasAte, fmtDataHora } from "@/lib/datas";
import { sair } from "./acoes";
import { Resposta } from "./resposta";
import { IconeAgenda, IconePermissoes, IconeSugestoes, IconeTermometro } from "./icones-topo";
import { Sino } from "./sino";
import type { Pendencias } from "@/lib/pendencias";

const PAPEL: Record<string, string> = {
  titular: "",
  apoio: "apoio",
  treinamento: "treinamento",
  responsavel_dia: "responsável do dia",
};

const STATUS: Record<string, { texto: string; classe: string }> = {
  pendente: { texto: "Aguardando você", classe: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  confirmado: { texto: "Confirmado", classe: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  recusado: { texto: "Não posso", classe: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  trocado: { texto: "Trocado", classe: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
};

export type Linha = {
  id: string;
  papel: string;
  status: string;
  motivo: string | null;
  eventos: { titulo: string; inicio: string; cor?: string | null };
  funcoes: { nome: string } | null;
  ministerios: { nome: string } | null;
};

/** Parte visual da tela inicial (Minhas escalas). */
export function TelaInicio({
  nome,
  coordenador,
  admin = false,
  proximas,
  historico,
  avisos = [],
  novosComunicados = 0,
  servidasNoMes = 0,
  pendencias = null,
  vagasParaMim = 0,
  trocasRecebidas = 0,
}: {
  nome: string;
  coordenador: boolean;
  admin?: boolean;
  proximas: Linha[];
  historico: Linha[];
  avisos?: { id: string; titulo: string; texto: string; ministerio: string }[];
  novosComunicados?: number;
  servidasNoMes?: number;
  pendencias?: Pendencias | null;
  vagasParaMim?: number;
  trocasRecebidas?: number;
}) {
  const aguardando = proximas.filter((e) => e.status === "pendente").length;
  const proximo = proximas.find((e) => e.status !== "recusado");
  const faltam = proximo ? diasAte(proximo.eventos.inicio) : 0;
  const quando = faltam <= 0 ? "Hoje" : faltam === 1 ? "Amanhã" : `Em ${faltam} dias`;

  const cartao = (e: Linha, comResposta: boolean) => {
    const s = STATUS[e.status];
    const papel = PAPEL[e.papel];
    return (
      <article key={e.id} className={`rounded-xl border p-4 ${e.eventos.cor && CORES[e.eventos.cor] ? CORES[e.eventos.cor].card : "border-neutral-200 dark:border-neutral-800"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium capitalize">{fmtDataHora.format(new Date(e.eventos.inicio))}</p>
            <p className="text-sm text-neutral-500">
              {e.eventos.titulo} · {e.funcoes?.nome ?? e.ministerios?.nome}
              {papel && ` (${papel})`}
            </p>
            {e.status === "recusado" && e.motivo && <p className="mt-1 text-xs text-neutral-400">Motivo: {e.motivo}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${s.classe}`}>{s.texto}</span>
        </div>
        {comResposta && <Resposta escalaId={e.id} status={e.status} />}
        {comResposta && e.papel === "titular" && e.funcoes && (e.status === "pendente" || e.status === "confirmado") && (
          <Link href={`/trocas/nova/${e.id}`} className="mt-2 inline-block text-sm text-violet-700 underline dark:text-violet-300">
            Pedir troca a um colega
          </Link>
        )}
      </article>
    );
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500">Igreja Nasci Pra Deus</p>
          <h1 className="text-2xl font-semibold">Olá, {nome} 👋</h1>
          {aguardando > 0 && (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              {aguardando === 1 ? "1 escala espera" : `${aguardando} escalas esperam`} sua confirmação.
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {admin && <IconePermissoes />}
            <IconeAgenda />
            {coordenador && <IconeTermometro />}
            <IconeSugestoes />
            <Sino novos={novosComunicados} />
          </div>
          <form action={sair} className="flex items-center gap-3">
            <Link href="/perfil" className="text-sm text-neutral-500 underline">Perfil</Link>
            <button className="text-sm text-neutral-500 underline">Sair</button>
          </form>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2">
        {coordenador && (
          <Link
            href="/montar"
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-violet-600 font-medium text-white"
          >
            Montar escala
          </Link>
        )}
        {coordenador && (
          <Link
            href="/voluntarios"
            className="flex h-12 min-w-[45%] flex-1 items-center justify-center rounded-xl border border-neutral-300 font-medium dark:border-neutral-700"
          >
            Voluntários
          </Link>
        )}
        <Link
          href="/disponibilidade"
          className="flex h-12 min-w-[45%] flex-1 items-center justify-center rounded-xl border border-neutral-300 font-medium dark:border-neutral-700"
        >
          Disponibilidade
        </Link>
        <Link
          href="/vagas"
          className="flex h-12 min-w-[45%] flex-1 items-center justify-center rounded-xl border border-neutral-300 font-medium dark:border-neutral-700"
        >
          Vagas abertas
        </Link>
      </nav>

      {proximo && (
        <section className="flex flex-col gap-3 rounded-2xl bg-violet-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-violet-100">Próximo evento</h2>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">{quando}</span>
          </div>
          <div>
            <p className="text-lg font-semibold">{proximo.eventos.titulo}</p>
            <p className="text-violet-100">{fmtDataHora.format(new Date(proximo.eventos.inicio))}</p>
          </div>
          <p className="rounded-xl bg-white/15 px-3 py-2 text-sm">
            {proximo.papel === "responsavel_dia" ? (
              <>Você é o <strong>responsável do dia</strong> em <strong>{proximo.ministerios?.nome}</strong></>
            ) : (
              <>
                Você serve nesse dia em <strong>{proximo.funcoes?.nome ?? proximo.ministerios?.nome}</strong>
                {proximo.funcoes && proximo.ministerios && <> · {proximo.ministerios.nome}</>}
                {PAPEL[proximo.papel] && ` (${PAPEL[proximo.papel]})`}
              </>
            )}
          </p>
          {proximo.status !== "pendente" && (
            <a href={`/agenda/${proximo.id}`} className="self-start rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium">
              📅 Adicionar à agenda
            </a>
          )}
          {proximo.status === "pendente" ? (
            <div className="rounded-xl bg-white p-3 text-neutral-900">
              <p className="mb-1 text-sm font-medium">Falta você confirmar:</p>
              <Resposta escalaId={proximo.id} status={proximo.status} />
            </div>
          ) : (
            <p className="text-sm font-medium text-violet-100">✓ Presença confirmada</p>
          )}
        </section>
      )}

      {(trocasRecebidas > 0 || vagasParaMim > 0) && (
        <section className="flex flex-col gap-2">
          {trocasRecebidas > 0 && (
            <Link href="/trocas" className="rounded-xl bg-violet-50 px-4 py-3 text-sm dark:bg-violet-950/40">
              🔁 {trocasRecebidas === 1 ? "Um colega pediu" : `${trocasRecebidas} colegas pediram`} para você cobrir uma escala. <strong>Responder</strong>
            </Link>
          )}
          {vagasParaMim > 0 && (
            <Link href="/vagas" className="rounded-xl bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/40">
              🙋 {vagasParaMim === 1 ? "Há 1 vaga aberta" : `Há ${vagasParaMim} vagas abertas`} que você pode assumir. <strong>Ver vagas</strong>
            </Link>
          )}
        </section>
      )}

      {servidasNoMes > 0 && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          🙌 Você serviu <strong>{servidasNoMes}</strong> {servidasNoMes === 1 ? "vez" : "vezes"} neste mês. Obrigado!
        </p>
      )}

      {pendencias && (pendencias.vagasAbertas.length > 0 || pendencias.semResposta.length > 0) && (
        <section className="flex flex-col gap-2 rounded-2xl border border-amber-300 p-4 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Pendências do time</h2>
            <Link href="/montar" className="text-sm text-violet-700 underline dark:text-violet-300">Resolver</Link>
          </div>
          {pendencias.vagasAbertas.map((v) => (
            <p key={`${v.eventoId}${v.funcao}`} className="text-sm">
              <strong>Vaga aberta:</strong> {v.funcao} · <span className="capitalize">{fmtDataHora.format(new Date(v.inicio))}</span>
              <span className="text-neutral-500"> ({v.recusou} não pode{v.motivo ? `: ${v.motivo}` : ""})</span>
            </p>
          ))}
          {pendencias.semResposta.map((r) => (
            <p key={r.id} className="text-sm">
              <strong>Sem resposta:</strong> {r.pessoa} · {r.funcao} ·{" "}
              <span className="capitalize">{fmtDataHora.format(new Date(r.inicio))}</span>
            </p>
          ))}
        </section>
      )}

      {avisos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-500">Comunicados</h2>
          {avisos.map((a) => (
            <Link key={a.id} href="/comunicados" className="rounded-xl bg-violet-50 p-4 dark:bg-violet-950/40">
              <p className="font-medium">{a.titulo}</p>
              <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">{a.texto}</p>
              <p className="mt-1 text-xs text-neutral-500">{a.ministerio}</p>
            </Link>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Minhas próximas escalas</h2>
        {proximas.length === 0 && (
          <p className="text-neutral-500">Nenhuma escala marcada. Quando o coordenador publicar, ela aparece aqui.</p>
        )}
        {proximas.map((e) => cartao(e, true))}
      </section>

      {historico.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-500">Últimas que você serviu</h2>
          {historico.map((e) => cartao(e, false))}
        </section>
      )}
    </main>
  );
}
