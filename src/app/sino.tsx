import Link from "next/link";

/** Sininho de comunicados; com novidades, mostra o número em vermelho. */
export function Sino({ novos }: { novos: number }) {
  return (
    <Link
      href="/comunicados"
      aria-label={novos > 0 ? `Comunicados e avisos: ${novos} novo${novos > 1 ? "s" : ""}` : "Comunicados e avisos"}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {novos > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
          {novos > 9 ? "9+" : novos}
        </span>
      )}
    </Link>
  );
}
