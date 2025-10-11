// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./column/**/*.{js,ts,jsx,tsx,mdx}", // あれば
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eaf6ff',
          100: '#d7edff',
          200: '#aeddff',
          300: '#7bccff',
          400: '#39b6ff',
          500: '#1594ff',
          600: '#0e78e6',
          700: '#0b5fbe',
          800: '#0a4d99',
          900: '#0a3f7d',
        },
      },
      backgroundImage: {
        'brand-grad':
          'linear-gradient(90deg, #39b6ff 0%, #1594ff 40%, #0e78e6 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
