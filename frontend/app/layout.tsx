import type { Metadata } from 'next'
import './globals.css'
import '@fontsource/space-grotesk';
import '@fontsource/sora';
import '@fontsource/jetbrains-mono';
import { usePathname } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Cafécode',
  description: 'A beginner-friendly online IDE designed for self-taught developers and bootcamp students. Write code, get instant help, and learn by doing.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Inter:wght@400;500;700&family=Playfair+Display:wght@700&family=Raleway:wght@400;500&display=swap" rel="stylesheet" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          :root {
            --font-poppins: 'Raleway', sans-serif;
            --font-heading: 'Playfair Display', serif;
            --font-mono: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, SFMono-Regular;
            --font-caveat: 'Caveat', cursive;
            --font-inter: 'Inter', sans-serif;
          }
        `,
          }}
        />
      </head>
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  )
}