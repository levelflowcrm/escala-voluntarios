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

export function IconeTermometro() {
  return (
    <Icone href="/termometro" nome="Termômetro do time">
      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
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
