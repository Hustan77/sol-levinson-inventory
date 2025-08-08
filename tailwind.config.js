module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        'status-pending': '0 0 15px rgba(251, 191, 36, 0.6)', // amber
        'status-arrived': '0 0 15px rgba(34, 197, 94, 0.6)',  // green
        'status-backordered': '0 0 15px rgba(239, 68, 68, 0.6)' // red
      }
    }
  },
  plugins: []
}
