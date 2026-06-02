/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'mb-black': '#000000',
        'mb-yellow': '#FBBE0A',
        'mb-yellow-dark': '#C99703',
        'mb-white': '#FFFFFF',
        'mb-gray': 'rgba(255,255,255,0.60)',
        'mb-border': 'rgba(255,255,255,0.08)',
        'mb-card': 'rgba(255,255,255,0.04)',
      },
      fontFamily: {
        sans: ['"Funnel Display"', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        container: '1280px',
      },
      animation: {
        marquee: 'marquee 35s linear infinite',
        'marquee-2': 'marquee2 35s linear infinite',
        'fade-up': 'fadeUp 0.7s ease forwards',
        'count-up': 'countUp 0.5s ease forwards',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        marquee2: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(50%)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
};
