/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        "ping-slow": "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        "ping-slower": "ping 3s cubic-bezier(0, 0, 0.2, 1) infinite",
        "ping-slowest": "ping 4s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
      scale: {
        25: "0.25",
      },
    },
  },
  plugins: [],
};
