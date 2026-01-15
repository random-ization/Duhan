# Duhan Korean Learning Platform

DuHan is an interactive Korean learning platform with comprehensive study materials, TOPIK preparation, and multimedia content.

## SEO Improvements

This repository has been enhanced with comprehensive SEO optimizations:

- **Dynamic Meta Tags**: Using react-helmet-async for per-page SEO
- **Sitemap Generation**: Automated sitemap.xml creation with all public routes
- **Robots.txt**: Proper crawling directives for search engines
- **Open Graph Tags**: Social media preview optimization
- **Twitter Cards**: Enhanced sharing on Twitter/X

For more details, see the build scripts in `package.json` and `scripts/` directory.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

This will:

1. Generate sitemap.xml and robots.txt
2. Build the application with Vite
3. Output to `dist/` directory with all SEO files included
