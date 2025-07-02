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
        {/* Bolt.new Badge only on homepage */}
        {pathname === '/' && <>
          <style>{`
            .bolt-badge {
              transition: all 0.3s ease;
            }
            @keyframes badgeIntro {
              0% { transform: rotateY(-90deg); opacity: 0; }
              100% { transform: rotateY(0deg); opacity: 1; }
            }
            .bolt-badge-intro {
              animation: badgeIntro 0.8s ease-out 1s both;
            }
            .bolt-badge-intro.animated {
              animation: none;
            }
            @keyframes badgeHover {
              0% { transform: scale(1) rotate(0deg); }
              50% { transform: scale(1.1) rotate(22deg); }
              100% { transform: scale(1) rotate(0deg); }
            }
            .bolt-badge:hover {
              animation: badgeHover 0.6s ease-in-out;
            }
          `}</style>
          <div className="fixed top-4 right-4 z-50">
            <a href="https://bolt.new/?rid=os72mi" target="_blank" rel="noopener noreferrer" className="block transition-all duration-300 hover:shadow-2xl">
              <img src="https://storage.bolt.army/white_circle_360x360.png" alt="Built with Bolt.new badge" className="w-20 h-20 md:w-28 md:h-28 rounded-full shadow-lg bolt-badge bolt-badge-intro" />
            </a>
          </div>
        </>}
      </body>
    </html>
  )
}