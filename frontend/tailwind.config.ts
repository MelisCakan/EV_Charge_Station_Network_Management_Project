import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          darkest: '#000D0C',
          dark: '#012623',
          primary: '#4C736F',
          light: '#D9D5D2',
          lightest: '#F2F2F0',
        },
      },
    },
  },
  plugins: [],
};

export default config;
