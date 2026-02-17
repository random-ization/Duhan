/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                brand: {
                    yellow: "#FFDE59",
                    purple: "#8B5CF6",
                    green: "#10B981",
                    pink: "#EC4899",
                    dark: "#0F172A",
                    surface: "#F8FAFC",
                },
            },
            fontFamily: {
                sans: ['PingFang SC', 'Microsoft YaHei', 'Inter', 'sans-serif'],
                display: ['Calistoga', 'cursive'],
                landing: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
                heading: ['Outfit', 'Calistoga', 'cursive'],
                serif: ['"Noto Serif KR"', 'ui-serif', 'serif'],
            },
            boxShadow: {
                'pop': '4px 4px 0px 0px rgba(0,0,0,1)',
                'pop-hover': '6px 6px 0px 0px rgba(0,0,0,1)',
                'pop-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
                'pop-card': '8px 8px 0px 0px rgba(0,0,0,1)',
                'card': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                'paper': '1px 1px 3px rgba(0,0,0,0.2), 0 10px 20px -5px rgba(0,0,0,0.1)',
                'glow': '0 0 20px rgba(255, 222, 89, 0.5)',
            },
            animation: {
                'float': 'float 3s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            }
        },
    },
    plugins: [],
}
