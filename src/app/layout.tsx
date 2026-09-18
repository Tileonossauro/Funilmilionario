import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GD Funnel Builder',
  description: 'Monte a jornada, acompanhe os números.',
}

/**
 * Tema aplicado antes da primeira pintura. Sem isto o dark mode pisca branco
 * a cada carregamento — o tipo de detalhe que faz o produto parecer barato.
 */
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('tema') || 'system';
    var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
