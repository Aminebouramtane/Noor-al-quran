/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        headline: ['Newsreader', 'Amiri', 'serif'],
        body: ['Manrope', 'Tajawal', 'sans-serif'],
        label: ['Manrope', 'Tajawal', 'sans-serif'],
        quran: ['Amiri', 'serif'],
      },
      colors: {
        primary: '#0d631b',
        'primary-container': '#2e7d32',
        secondary: '#735c00',
        'secondary-container': '#fed65b',
        'on-primary': '#ffffff',
        'on-secondary-container': '#745c00',
        surface: '#f9f9f9',
        'surface-container-low': '#f3f3f3',
        'surface-container-high': '#e8e8e8',
        'surface-container-highest': '#e2e2e2',
        'surface-container-lowest': '#ffffff',
        'on-surface': '#1a1c1c',
        'on-surface-variant': '#40493d',
        outline: '#707a6c',
        'outline-variant': '#bfcaba',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
      },
    },
  },
  plugins: [],
}
