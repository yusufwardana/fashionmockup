/** @type {import('tailwindcss').Config} */
export default {
  // Wajib: Daftar file tempat Tailwind akan memindai kelas CSS.
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Menambahkan font Inter agar styling di App.jsx terlihat optimal
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      // Warna kustom jika diperlukan, di sini kita biarkan default dulu.
      colors: {
        'indigo-700': '#4338ca',
        'green-600': '#10b981',
      }
    },
  },
  plugins: [],
}