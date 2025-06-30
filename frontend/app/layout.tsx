import type { Metadata } from 'next'
import './globals.css'
import '@fontsource/space-grotesk';
import '@fontsource/sora';
import '@fontsource/jetbrains-mono';

export const metadata: Metadata = {
  title: 'CodeCraft IDE - Learn to Code with Confidence',
  description: 'A beginner-friendly online IDE designed for self-taught developers and bootcamp students. Write code, get instant help, and learn by doing.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <style>{`
          :root {
            --font-poppins: 'Sora Variable', 'Sora', ui-sans-serif, system-ui;
            --font-heading: 'Space Grotesk Variable', 'Space Grotesk', ui-sans-serif, system-ui;
            --font-mono: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, SFMono-Regular;
          }
        `}</style>
      </head>
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  )
}