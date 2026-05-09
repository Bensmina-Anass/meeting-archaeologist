import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: '#004E64',
        canvas: '#EDFFEC',
        burgundy: '#6B2737',
        muted: '#96897B',
        accent: '#CE6C47',
      },
      fontFamily: {
        serif: ['Instrument Serif', 'Iowan Old Style', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        fadeUp: 'fadeUp 240ms ease-out both',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      letterSpacing: {
        eyebrow: '0.16em',
        mono: '0.14em',
      },
    },
  },
  plugins: [],
}

export default config
