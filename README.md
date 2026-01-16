# Duhan Korean Learning Platform

DuHan is an interactive Korean learning platform with comprehensive study materials, TOPIK preparation, and multimedia content.

## SEO Improvements

This repository has been enhanced with comprehensive SEO optimizations including **Static Site Generation (SSG)** for public routes:

- **SSG Pre-rendering**: All public routes are pre-rendered to static HTML files with route-specific meta tags
- **Dynamic Meta Tags**: Using react-helmet-async for client-side meta tag updates
- **Sitemap Generation**: Automated sitemap.xml creation with all public routes
- **Robots.txt**: Proper crawling directives for search engines
- **Open Graph Tags**: Social media preview optimization
- **Twitter Cards**: Enhanced sharing on Twitter/X

### How SSG Works

The build process automatically:
1. Generates `sitemap.xml` and `robots.txt`
2. Builds the application with Vite
3. Pre-renders all 8 public routes to static HTML files:
   - `/` → `dist/index.html`
   - `/login` → `dist/login/index.html`
   - `/register` → `dist/register/index.html`
   - `/pricing` → `dist/pricing/index.html`
   - `/terms` → `dist/terms/index.html`
   - `/privacy` → `dist/privacy/index.html`
   - `/refund` → `dist/refund/index.html`
   - `/forgot-password` → `dist/forgot-password/index.html`

Each pre-rendered HTML file contains route-specific SEO meta tags, making the content immediately visible to search engines and social media crawlers.

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
3. Pre-render all public routes with optimized meta tags
4. Output to `dist/` directory with all SEO files included
