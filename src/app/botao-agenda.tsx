import { linkGoogleAgenda } from "@/lib/ics";

/** "Adicionar à Agenda do Google": abre o app (ou o site) com o evento já preenchido. */
export function BotaoAgenda({
  titulo,
  inicio,
  duracaoMin,
  descricao,
  local,
  sobreFundoEscuro = false,
  sobreFundoClaro = false,
}: {
  titulo: string;
  inicio: string;
  duracaoMin?: number;
  descricao?: string;
  local?: string;
  sobreFundoEscuro?: boolean;
  /** Fundo claro mesmo no modo escuro (ex.: cartão amarelo dos compromissos do time) */
  sobreFundoClaro?: boolean;
}) {
  const classe = sobreFundoEscuro
    ? "self-start rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium"
    : sobreFundoClaro
      ? "text-violet-800 underline"
      : "text-violet-700 underline dark:text-violet-300";
  return (
    <a href={linkGoogleAgenda({ titulo, inicio, duracaoMin, descricao, local })} target="_blank" rel="noopener noreferrer" className={classe}>
      📅 Adicionar à Agenda do Google
    </a>
  );
}
