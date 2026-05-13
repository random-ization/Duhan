/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#FFDE59',
          purple: '#8B5CF6',
          green: '#10B981',
          pink: '#EC4899',
          dark: '#0F172A',
          surface: '#F8FAFC',
        },
        // Desktop K-Soft Design System Tokens
        k: {
          bg: '#FBF8F3',
          bg2: '#F5EFE5',
          card: '#FFFFFF',
          ink: '#1F1B17',
          ink2: '#3D3832',
          sub: '#8C8377',
          'sub-light': '#B8AFA2',
          line: 'rgba(31, 27, 23, 0.08)',
          line2: 'rgba(31, 27, 23, 0.14)',
          'line-base': '31, 27, 23', // For opacity usage: bg-[rgba(var(--color-k-line-base),0.05)] or simply using custom CSS variables if needed.
          pink: '#F5C7C0',
          'pink-deep': '#C97A6E',
          mint: '#C8DCCF',
          'mint-deep': '#5B8472',
          butter: '#F7E8B8',
          'butter-deep': '#A8872E',
          lilac: '#D8CFE6',
          'lilac-deep': '#7E6AA8',
          sky: '#BDD4E0',
          'sky-deep': '#3F6A85',
          crimson: '#A23B2E',
          indigo: '#2F3F68',
          jade: '#4C6B4E',
          gold: '#B38941',
        }
      },
      fontFamily: {
        sans: ['PingFang SC', 'Microsoft YaHei', 'Inter', 'sans-serif'],
        display: ['Calistoga', 'cursive'],
        landing: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        heading: ['Outfit', 'Calistoga', 'cursive'],
        serif: ['"Noto Serif KR"', 'ui-serif', 'serif'],
        // K-Soft Fonts
        'k-sans': ['"Pretendard"', '-apple-system', 'system-ui', '"PingFang SC"', 'sans-serif'],
        'k-serif': ['"Noto Serif KR"', 'Georgia', 'serif'],
        'k-mono': ['"Space Grotesk"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'k-xs': '10px',
        'k-sm': '14px',
        'k-md': '18px',
        'k-lg': '22px',
        'k-xl': '28px',
        'k-xxl': '32px',
      },
      boxShadow: {
        pop: '4px 4px 0px 0px rgba(0,0,0,1)',
        'pop-hover': '6px 6px 0px 0px rgba(0,0,0,1)',
        'pop-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
        'pop-card': '8px 8px 0px 0px rgba(0,0,0,1)',
        brutal: '8px 8px 0px 0px #0f172a',
        'brutal-sm': '4px 4px 0px 0px #0f172a',
        card: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        paper: '1px 1px 3px rgba(0,0,0,0.2), 0 10px 20px -5px rgba(0,0,0,0.1)',
        glow: '0 0 20px rgba(255, 222, 89, 0.5)',
        // K-Soft Shadows
        'k-sh': '0 2px 8px rgba(31,27,23,0.04), 0 12px 32px rgba(31,27,23,0.06)',
        'k-sh-sm': '0 1px 3px rgba(31,27,23,0.05), 0 4px 12px rgba(31,27,23,0.04)',
        'k-sh-lg': '0 8px 20px rgba(31,27,23,0.08), 0 24px 60px rgba(31,27,23,0.1)',
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
