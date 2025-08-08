/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        'glass': 'inset 0 1px 0 rgba(255,255,255,.06), 0 10px 30px rgba(2,6,23,.35)',
        'status-pending': '0 0 18px rgba(251,191,36,.55)',     // amber
        'status-arrived': '0 0 18px rgba(34,197,94,.55)',       // green
        'status-backordered': '0 0 18px rgba(239,68,68,.55)',   // red
        'status-special': '0 0 18px rgba(168,85,247,.55)',      // purple
      },
      transitionTimingFunction: {
        'morph': 'cubic-bezier(.2,.8,.2,1)',
      },
      keyframes: {
        'sheen': {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(120%)' },
        },
      },
      animation: {
        sheen: 'sheen 2.6s linear infinite',
      },
    },
  },
  plugins: [],
}
