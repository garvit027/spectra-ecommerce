// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Poppins"', "sans-serif"],
      },
      colors: {
        brand: {
          purple: "#6b21a8", // custom purple for branding
          light: "#f3e8ff",
        },
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"), // better form styling
    require("@tailwindcss/typography"), // nice prose (useful for product descriptions)
    require("@tailwindcss/aspect-ratio"), // keeps images proportionate
  ],
};