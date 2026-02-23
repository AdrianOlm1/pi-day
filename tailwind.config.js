/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        adrian: '#3B82F6',
        'adrian-light': '#93C5FD',
        'adrian-dark': '#1D4ED8',
        sarah: '#F472B6',
        'sarah-light': '#FBCFE8',
        'sarah-dark': '#DB2777',
        shared: '#8B5CF6',
        'shared-light': '#C4B5FD',
      },
    },
  },
  plugins: [],
};
