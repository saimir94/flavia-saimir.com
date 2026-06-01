import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      },
      colors: {
        ivory: '#f8f3ec',
        champagne: '#c7a66b',
        ink: '#1d1a17',
        blush: '#efe2d7'
      }
    }
  },
  plugins: []
};
export default config;
