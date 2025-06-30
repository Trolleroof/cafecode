import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-heading)', 'ui-serif', 'Georgia', 'serif'],
        body: ['var(--font-poppins)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        // Coffee Shop Color Palette
        'cream-beige': 'rgb(var(--cream-beige) / <alpha-value>)',
        'medium-coffee': 'rgb(var(--medium-coffee) / <alpha-value>)',
        'dark-charcoal': 'rgb(var(--dark-charcoal) / <alpha-value>)',
        'light-cream': 'rgb(var(--light-cream) / <alpha-value>)',
        'deep-espresso': 'rgb(var(--deep-espresso) / <alpha-value>)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'steam-rise': {
          '0%, 100%': {
            transform: 'translateY(0) rotate(0deg)',
            opacity: '0.7',
          },
          '50%': {
            transform: 'translateY(-20px) rotate(5deg)',
            opacity: '1',
          },
        },
        'coffee-drip': {
          '0%': {
            transform: 'translateY(-10px)',
            opacity: '0',
          },
          '50%': {
            opacity: '1',
          },
          '100%': {
            transform: 'translateY(20px)',
            opacity: '0',
          },
        },
        'bean-bounce': {
          '0%, 100%': {
            transform: 'translateY(0) rotate(0deg)',
          },
          '25%': {
            transform: 'translateY(-15px) rotate(90deg)',
          },
          '50%': {
            transform: 'translateY(-20px) rotate(180deg)',
          },
          '75%': {
            transform: 'translateY(-10px) rotate(270deg)',
          },
        },
        'warm-glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(163, 106, 62, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(163, 106, 62, 0.6)',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'steam-rise': 'steam-rise 3s ease-in-out infinite',
        'coffee-drip': 'coffee-drip 2s ease-in-out infinite',
        'bean-bounce': 'bean-bounce 4s ease-in-out infinite',
        'warm-glow': 'warm-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;