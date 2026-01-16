export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      borderRadius: {
        sm: "2px",
        DEFAULT: "3px",
        md: "5px",
        lg: "6px",
        xl: "8px",
        "2xl": "10px",
        "3xl": "12px",
      },
      colors: {
        dark1: "#0a1020",
        dark2: "#0f172a",
        grayMag: "#9aa8c2",
        lightMag: "#e7eeff",
        brand: "#1e4fff",
        brandDark: "#163ec7",
        accent: "#06b6d4",
        accentDark: "#0891b2",
        teal: "#14b8a6",
        tealDark: "#0f766e",
      },
      backgroundImage: {
        magGradient: "linear-gradient(90deg, #1e4fff, #06b6d4)",
      },
      fontFamily: {
        lastica: ["Lastica"],
        display: ["Space Grotesk", "sans-serif"],
        body: ["Manrope", "sans-serif"],
      },
    },
  },
  plugins: [],
};
