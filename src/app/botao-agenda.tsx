import { linkGoogleAgenda } from "@/lib/ics";

/** "Adicionar à agenda": abre o Google Agenda já preenchido; o .ics fica como alternativa (Apple, Outlook). */
export function BotaoAgenda({
  titulo,
  inicio,
  duracaoMin,
  descricao,
  local,
  icsHref,
  sobreFundoEscuro = false,
}: {
  titulo: string;
  inicio: string;
  duracaoMin?: number;
  descricao?: string;
  local?: string;
  icsHref: string;
  sobreFundoEscuro?: boolean;
}) {
  const principal = sobreFundoEscuro
    ? "rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium"
    : "text-violet-700 underline dark:text-violet-300";
  const alternativa = sobreFundoEscuro ? "text-xs text-violet-100 underline" : "text-neutral-500 underline";
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <a href={linkGoogleAgenda({ titulo, inicio, duracaoMin, descricao, local })} target="_blank" rel="noopener noreferrer" className={principal}>
        📅 Adicionar ao Google Agenda
      </a>
      <a href={icsHref} className={alternativa}>
        outro app (.ics)
      </a>
    </span>
  );
}
