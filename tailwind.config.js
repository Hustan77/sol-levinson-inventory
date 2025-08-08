module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { boxShadow: { 'status-pending':'0 0 15px rgba(251,191,36,.6)', 'status-arrived':'0 0 15px rgba(34,197,94,.6)', 'status-backordered':'0 0 15px rgba(239,68,68,.6)' } } },
  plugins: [],
}
