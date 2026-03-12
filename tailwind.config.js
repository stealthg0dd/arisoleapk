/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Arisole Brand Colors
        'arisole-orange': '#F26F05',
        'arisole-orange-light': '#FF8A33',
        'arisole-peach': '#FFCBA4',
        'metallic-gold': '#D4AF37',
        'gold-light': '#E6C65A',
        
        // Background Colors
        'bg-light': '#F9F9F9',
        'bg-card': 'rgba(255, 255, 255, 0.7)',
        'bg-glass': 'rgba(255, 255, 255, 0.25)',
        
        // Dark Mode (Insight Terminal)
        'terminal-bg': '#0D0D0D',
        'terminal-surface': '#1A1A1A',
        'neon-orange': '#FF6B00',
        'neon-glow': 'rgba(242, 111, 5, 0.5)',
        
        // Text Colors
        'text-primary': '#1A1A1A',
        'text-secondary': '#666666',
        'text-muted': '#999999',
        'text-light': '#F9F9F9',
      },
      borderRadius: {
        'card': '24px',
        'button': '16px',
        'input': '12px',
      },
      fontFamily: {
        'sans': ['System', 'sans-serif'],
        'display': ['System', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 20px rgba(242, 111, 5, 0.4)',
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.4)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
      },
      backgroundImage: {
        'orange-gradient': 'linear-gradient(135deg, #F26F05 0%, #FFCBA4 100%)',
        'peach-gradient': 'linear-gradient(180deg, #FFCBA4 0%, #F9F9F9 100%)',
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #E6C65A 100%)',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)',
      },
    },
  },
  plugins: [],
};
