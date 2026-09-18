/**
 * Ícones das etapas: SVG de traço, 16px, todos no mesmo peso visual.
 *
 * Desenhados como formas genéricas (chat, página, carrinho) de propósito —
 * logotipo de terceiro num node é problema de marca e envelhece mal.
 */

const PATHS: Record<string, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  ads: (
    <>
      <path d="M3 10v4h3l5 4V6l-5 4H3Z" />
      <path d="M16 9a4 4 0 0 1 0 6" />
    </>
  ),
  busca: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  musica: (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
  play: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="4" />
      <path d="m10.5 9.5 4.5 2.5-4.5 2.5Z" fill="currentColor" stroke="none" />
    </>
  ),
  pessoas: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.5a3 3 0 0 1 0 5.8M17 15.5a5 5 0 0 1 3.5 3.5" />
    </>
  ),
  pessoa: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  circulo: (
    <>
      <circle cx="12" cy="12" r="8.5" strokeDasharray="3 2.5" />
      <circle cx="12" cy="12" r="3.5" />
    </>
  ),
  imagem: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="3" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m4 17 5-4.5 4.5 4 3-2.5L21 18" />
    </>
  ),
  pagina: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M3 8.5h18" />
      <path d="M7 12.5h7M7 16h4" />
    </>
  ),
  carrinho: (
    <>
      <path d="M3 4h2l2.5 11h10L20 7H6" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </>
  ),
  formulario: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M8 8.5h8M8 12h8M8 15.5h4" />
    </>
  ),
  chat: (
    <>
      <path d="M20.5 11.5a7.5 7.5 0 0 1-11 6.7L4 20l1.8-5.3A7.5 7.5 0 1 1 20.5 11.5Z" />
    </>
  ),
  email: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="m3.5 7.5 8.5 6 8.5-6" />
    </>
  ),
  telefone: (
    <>
      <path d="M6 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 5.7 2 2 0 0 1 6 3.5Z" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  raio: (
    <>
      <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6Z" />
    </>
  ),
  estrela: (
    <>
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z" />
    </>
  ),
  celular: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="3" />
      <path d="M10.5 18.5h3" />
    </>
  ),
  condicao: (
    <>
      <path d="M12 3 21 12l-9 9-9-9Z" />
    </>
  ),
  nota: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H17l3 3v12.5A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5Z" />
      <path d="M8 9h6M8 13h8M8 17h5" />
    </>
  ),
}

export function IconeEtapa({ nome, className }: { nome: string; className?: string }) {
  const conteudo = PATHS[nome] ?? PATHS.condicao

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {conteudo}
    </svg>
  )
}
