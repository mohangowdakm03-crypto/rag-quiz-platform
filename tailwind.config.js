/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./teacher.html",
    "./create.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Plus Jakarta Sans"',
          'system-ui',
          'sans-serif'
        ],
        mono: [
          '"SF Mono"',
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ],
      },
      colors: {
        apple: {
          bg: '#000000',
          dark: '#08080a',
          card: '#121215',
          elevated: '#1a1a1e',
          surface: '#242429',
          border: 'rgba(255, 255, 255, 0.08)',
          borderHover: 'rgba(255, 255, 255, 0.16)',
          text: '#f5f5f7',
          subtext: '#86868b',
          muted: '#6e6e73',
          blue: '#0071e3',
          blueLight: '#2997ff',
          green: '#30d158',
          gold: '#ffd60a',
          purple: '#bf5af2',
        },
      },
      boxShadow: {
        'apple-card': '0 8px 32px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
        'apple-elevated': '0 16px 48px -8px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)',
        'apple-glow': '0 0 40px -10px rgba(41, 151, 255, 0.3)',
        'apple-button': '0 2px 10px rgba(0, 113, 227, 0.35)',
      },
    },
  },
  plugins: [],
}
