/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "sky":        "#0EA5E9",
        "sky-light":  "#E0F2FE",
        "sky-dark":   "#0284C7",
        "amber":      "#F59E0B",
        "amber-light":"#FEF3C7",
        "amber-dark": "#D97706",
        "success":    "#059669",
        "warning":    "#D97706",
        "danger":     "#DC2626",
        "bg":         "#F8FAFC",
        "card":       "#FFFFFF",
        "card-2":     "#F1F5F9",
        "t-primary":  "#0F172A",
        "t-secondary":"#64748B",
        "t-muted":    "#94A3B8",
        "border-c":   "#E2E8F0",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans SC", "-apple-system", "sans-serif"],
      },
      animation: {
        "fade-in":    "fadeIn 0.22s ease-out forwards",
        "fade-in-up": "fadeInUp 0.25s ease-out forwards",
        "pulse-blue": "pulseBlue 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
