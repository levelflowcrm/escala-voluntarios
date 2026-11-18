/** Monta um arquivo .ics (iCalendar) de um evento, para o voluntário adicionar à agenda do celular. */
export function montarIcs(e: {
  id: string;
  titulo: string;
  inicio: string | Date;
  duracaoMin?: number;
  descricao?: string;
  agora?: Date;
}): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ini = new Date(e.inicio);
  const fim = new Date(ini.getTime() + (e.duracaoMin ?? 150) * 60_000);
  const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MaisConectados//Escala//PT-BR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.id}@maisconectados`,
    `DTSTAMP:${fmt(e.agora ?? new Date())}`,
    `DTSTART:${fmt(ini)}`,
    `DTEND:${fmt(fim)}`,
    `SUMMARY:${esc(e.titulo)}`,
    ...(e.descricao ? [`DESCRIPTION:${esc(e.descricao)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(e.titulo)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/**
 * Link do Google Agenda com o evento já preenchido ("Adicionar ao Google Agenda"):
 * abre o app (ou o site) em vez de baixar um arquivo.
 */
export function linkGoogleAgenda(e: { titulo: string; inicio: string | Date; duracaoMin?: number; descricao?: string; local?: string }): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ini = new Date(e.inicio);
  const fim = new Date(ini.getTime() + (e.duracaoMin ?? 150) * 60_000);
  const partes = [
    "action=TEMPLATE",
    `text=${encodeURIComponent(e.titulo)}`,
    `dates=${fmt(ini)}/${fmt(fim)}`,
    "ctz=America%2FSao_Paulo",
    ...(e.descricao ? [`details=${encodeURIComponent(e.descricao)}`] : []),
    ...(e.local ? [`location=${encodeURIComponent(e.local)}`] : []),
  ];
  return `https://calendar.google.com/calendar/render?${partes.join("&")}`;
}
