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
    "PRODID:-//Culto360//Escala//PT-BR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.id}@culto360`,
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
