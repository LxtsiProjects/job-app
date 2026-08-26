/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens — see styles/globals.css for rationale
        ink: '#141A2E',      // primary text, headers
        paper: '#FAFAF8',    // page background
        slate: '#636B78',    // secondary text
        line: '#E4E2DC',     // borders/dividers
        signal: '#2454E8',   // primary action (apply, links)
        signalDark: '#1B3FB8',
        stageNew: '#8A8F99',     // New / unactioned
        stageApplied: '#D98E33', // Applied
        stageInterview: '#1C8F82', // Interview
        stageOffer: '#3E8E56',   // Offer
        stageRejected: '#C05656',// Rejected
      },
      fontFamily: {
        sans: ['"Public Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
}
