/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                background: "#F0F4F8",
            },
            fontFamily: {
                sans: ['PingFang SC', 'Microsoft YaHei', 'Inter', 'sans-serif'],
                display: ['Calistoga', 'cursive'],
            },
            boxShadow: {
                'pop': '4px 4px 0px 0px rgba(0,0,0,1)',
                'pop-hover': '6px 6px 0px 0px rgba(0,0,0,1)',
                'pop-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
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
