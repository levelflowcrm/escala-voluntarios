import Link from "next/link";

const base = "flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700";
const svg = "h-5 w-5";

/** Atalho em ícone no topo da tela inicial. */
function Icone({ href, nome, children }: { href: string; nome: string; children: React.ReactNode }) {
  return (
    <Link href={href} aria-label={nome} title={nome} className={base}>
      <svg viewBox="0 0 24 24" className={svg} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </Link>
  );
}

export function IconeEquilibrio() {
  return (
    <Icone href="/termometro" nome="Equilíbrio do time">
      <path d="M7 20h10" />
      <path d="M6 6l6-1 6 1" />
      <path d="M12 3v17" />
      <path d="M9 12L6 6l-3 6a3 3 0 0 0 6 0" />
      <path d="M21 12l-3-6-3 6a3 3 0 0 0 6 0" />
    </Icone>
  );
}

export function IconeAniversariantes() {
  return (
    <Icone href="/aniversariantes" nome="Aniversariantes">
      <path d="M3 20h18v-8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8z" />
      <path d="M3 14.8c.3.1.7.2 1 .2a2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1c.4 0 .7-.1 1-.2" />
      <path d="M12 4l1.5 1.6a2 2 0 1 1-3 .1L12 4z" />
    </Icone>
  );
}

export function IconeSugestoes() {
  return (
    <Icone href="/sugestoes" nome="Sugestões">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </Icone>
  );
}

export function IconeAgenda() {
  return (
    <Icone href="/agenda" nome="Agenda da igreja">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Icone>
  );
}

export function IconePermissoes() {
  return (
    <Icone href="/permissoes" nome="Permissões da equipe">
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Icone>
  );
}

export function IconeContribuir() {
  return (
    <Icone href="/contribuir" nome="Apoie o Mais Conectados">
      <path d="M12 21s-7-4.6-9.3-9.2C1.2 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 22.8 8.6 21.3 11.8 19 16.4 12 21 12 21Z" />
    </Icone>
  );
}
