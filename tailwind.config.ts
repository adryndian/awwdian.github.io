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
        claude: {
          bg: '#1a1a1a',
          sidebar: '#2d2d2d',
          input: '#3d3d3d',
          border: '#4d4d4d',
          accent: '#d97757',
          text: '#e0e0e0',
          muted: '#a0a0a0'
        }
      }
    }
  },
  plugins: [],
}
export default config
