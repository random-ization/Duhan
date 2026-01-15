# DuHan - Korean Learning Platform

A comprehensive Korean learning platform featuring interactive lessons, TOPIK exam preparation, authentic podcasts, and personalized learning experiences.

## Features

- 📚 **Interactive Textbooks**: Digital textbooks with interactive lessons and exercises
- 📝 **TOPIK Exam Prep**: Comprehensive TOPIK exam preparation with past papers
- 🎧 **Podcast Learning**: Learn Korean through authentic podcasts
- 📖 **Vocabulary Builder**: Spaced repetition system for vocabulary learning
- 📊 **Progress Tracking**: Track your learning progress and achievements
- 🎯 **Personalized Learning**: Adaptive learning paths based on your level

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Convex (serverless backend)
- **Styling**: Tailwind CSS
- **Authentication**: Convex Auth
- **Internationalization**: i18next
- **Testing**: Vitest, Playwright
- **SEO**: react-helmet-async, sitemap generation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Convex account (for backend services)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/random-ization/Duhan.git
   cd Duhan
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Convex URL and other required environment variables.

4. Start the development server:

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production (includes sitemap generation)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm test` - Run unit tests
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage report
- `npm run generate:sitemap` - Generate sitemap.xml

## Build & Deployment

### Production Build

The production build includes:

- Code minification and optimization
- Automatic sitemap generation
- Asset optimization
- Code splitting for better performance

```bash
npm run build
```

The built files will be in the `dist/` directory.

### SEO Features

The application includes comprehensive SEO optimizations:

#### Meta Tags

All public pages include:

- Dynamic `<title>` tags
- Meta descriptions
- Canonical URLs
- Open Graph tags for social media
- Twitter Card tags

#### Sitemap

A sitemap is automatically generated during the build process at `/sitemap.xml`. The sitemap includes:

- Landing page (/)
- Pricing page (/pricing)
- Terms of Service (/terms)
- Privacy Policy (/privacy)
- Refund Policy (/refund)

To manually generate the sitemap:

```bash
npm run generate:sitemap
```

To update the base URL in the sitemap, edit `scripts/generate-sitemap.mjs` and update the `BASE_URL` constant.

#### Robots.txt

A `robots.txt` file is included at `/robots.txt` that:

- Allows crawling of public content
- Blocks authenticated/user-specific routes
- Points to the sitemap location

## Project Structure

```
Duhan/
├── public/                 # Static assets
│   ├── robots.txt         # SEO robots file
│   ├── sitemap.xml        # Auto-generated sitemap
│   └── locales/           # Translation files
├── scripts/               # Build and utility scripts
│   └── generate-sitemap.mjs
├── src/
│   ├── components/        # Reusable components
│   │   └── SEO.tsx       # SEO meta tag component
│   ├── config/           # Configuration files
│   │   └── routes.config.ts  # Route definitions for SEO
│   ├── contexts/         # React contexts
│   ├── features/         # Feature modules
│   ├── pages/            # Page components
│   ├── utils/            # Utility functions
│   ├── App.tsx           # Main app component
│   ├── index.tsx         # Entry point
│   └── routes.tsx        # Route definitions
├── convex/               # Convex backend code
└── tests/                # Test files
```

## SEO Implementation

### Adding Meta Tags to New Pages

To add SEO meta tags to a new page:

1. Import the SEO component:

   ```tsx
   import { SEO } from '../components/SEO';
   ```

2. Add the SEO component at the top of your page:
   ```tsx
   <SEO
     title="Your Page Title - DuHan"
     description="Your page description for search engines"
     canonical="/your-page-path"
   />
   ```

### Adding New Routes to Sitemap

To add new public routes to the sitemap:

1. Edit `src/config/routes.config.ts`
2. Add your route to the `PUBLIC_ROUTES` array:
   ```typescript
   {
     path: '/new-page',
     title: 'New Page - DuHan',
     description: 'Description of the new page',
     isPublic: true,
   }
   ```
3. Run `npm run build` to regenerate the sitemap

## Testing

### Unit Tests

```bash
npm test
```

### E2E Tests

```bash
npx playwright test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Add license information]

## Contact

For support, email support@koreanstudy.me

## Production URL

https://www.koreanstudy.me
