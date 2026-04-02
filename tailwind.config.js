/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: {
          light: '#FAFAF9',
          dark: '#0F0F0D',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1A1A17',
        },
        accent: {
          mono: { light: '#111111', dark: '#FFFFFF' },
          amber: { light: '#D97706', dark: '#F59E0B' },
          indigo: { light: '#4F46E5', dark: '#818CF8' },
          rose: { light: '#E11D48', dark: '#FB7185' },
          emerald: { light: '#059669', dark: '#34D399' },
        },
      },
    },
  },
  plugins: [],
};
