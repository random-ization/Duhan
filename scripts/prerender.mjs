#!/usr/bin/env node

/**
 * Simple SSG Pre-renderer for Public Routes
 * 
 * This script generates static HTML files for public routes by:
 * 1. Reading the built index.html
 * 2. Injecting route-specific meta tags
 * 3. Creating separate HTML files for each public route
 * 
 * This provides SEO benefits without requiring framework migration or complex SSR setup.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Public routes configuration
const PUBLIC_ROUTES = [
  {
    path: '/',
    meta: {
      title: 'DuHan - Learn Korean Online | Interactive Korean Learning Platform',
      description: "Master Korean with DuHan's interactive learning platform. Study vocabulary, grammar, TOPIK preparation, podcasts, and videos. Start your Korean learning journey today!",
      keywords: 'Korean learning, learn Korean, Korean language, TOPIK, Korean vocabulary, Korean grammar, Korean courses',
    },
  },
  {
    path: '/login',
    meta: {
      title: 'Login - DuHan Korean Learning',
      description: 'Sign in to DuHan to continue your Korean learning journey. Access your courses, progress, and personalized learning materials.',
      keywords: 'login, sign in, Korean learning login',
    },
  },
  {
    path: '/register',
    meta: {
      title: 'Sign Up - DuHan Korean Learning',
      description: 'Create your free DuHan account and start learning Korean today. Join thousands of students mastering Korean with our interactive platform.',
      keywords: 'sign up, register, create account, start learning Korean',
    },
  },
  {
    path: '/pricing',
    meta: {
      title: 'Pricing Plans - DuHan Korean Learning',
      description: 'Choose the perfect plan for your Korean learning journey. Access premium courses, TOPIK preparation, and exclusive content with DuHan.',
      keywords: 'pricing, plans, subscription, Korean learning courses',
    },
  },
  {
    path: '/terms',
    meta: {
      title: 'Terms of Service - DuHan',
      description: 'Read the terms of service for DuHan Korean learning platform. Learn about user rights, responsibilities, and platform usage guidelines.',
      keywords: 'terms of service, legal, user agreement',
    },
  },
  {
    path: '/privacy',
    meta: {
      title: 'Privacy Policy - DuHan',
      description: 'Learn how DuHan protects your privacy and handles your personal data. Our commitment to user privacy and data security.',
      keywords: 'privacy policy, data protection, user privacy',
    },
  },
  {
    path: '/refund',
    meta: {
      title: 'Refund Policy - DuHan',
      description: "Understand DuHan's refund policy for subscriptions and purchases. Learn about our refund process and eligibility requirements.",
      keywords: 'refund policy, money back, cancellation',
    },
  },
  {
    path: '/forgot-password',
    meta: {
      title: 'Forgot Password - DuHan',
      description: 'Reset your DuHan account password. Enter your email to receive password reset instructions.',
      keywords: 'forgot password, reset password, account recovery',
    },
  },
];

const SITE_URL = 'https://koreanstudy.me';
const DIST_DIR = join(__dirname, '..', 'dist');

/**
 * Inject route-specific meta tags into HTML
 */
function injectMetaTags(html, route) {
  const { title, description, keywords } = route.meta;
  const canonicalUrl = `${SITE_URL}${route.path}`;

  // Escape special regex characters and HTML entities
  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper to replace meta tag content
  function replaceMetaContent(html, pattern, replacement) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(html)) {
      return html.replace(regex, replacement);
    }
    return html;
  }

  // Replace title
  html = html.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeHtml(title)}</title>`
  );

  // Replace meta description
  html = replaceMetaContent(
    html,
    '<meta\\s+name="description"\\s+content="[^"]*"\\s*/?\\s*>',
    `<meta name="description" content="${escapeHtml(description)}" />`
  );

  // Replace meta keywords
  if (keywords) {
    html = replaceMetaContent(
      html,
      '<meta\\s+name="keywords"\\s+content="[^"]*"\\s*/?\\s*>',
      `<meta name="keywords" content="${escapeHtml(keywords)}" />`
    );
  }

  // Replace canonical URL
  html = replaceMetaContent(
    html,
    '<link\\s+rel="canonical"\\s+href="[^"]*"\\s*/?\\s*>',
    `<link rel="canonical" href="${canonicalUrl}" />`
  );

  // Replace Open Graph tags
  html = replaceMetaContent(
    html,
    '<meta\\s+property="og:url"\\s+content="[^"]*"\\s*/?\\s*>',
    `<meta property="og:url" content="${canonicalUrl}" />`
  );

  html = replaceMetaContent(
    html,
    '<meta\\s+property="og:title"\\s+content="[^"]*"\\s*/?\\s*>',
    `<meta property="og:title" content="${escapeHtml(title)}" />`
  );

  html = replaceMetaContent(
    html,
    '<meta\\s+property="og:description"\\s+content="[^"]*"\\s*/?\\s*>',
    `<meta property="og:description" content="${escapeHtml(description)}" />`
  );

  // Replace Twitter Card tags
  html = replaceMetaContent(
    html,
    '<meta\\s+property="twitter:url"\\s+content="[^"]*"\\s*/?\\s*>',
    `<meta property="twitter:url" content="${canonicalUrl}" />`
  );

  html = replaceMetaContent(
    html,
    '<meta\\s+property="twitter:title"\\s+content="[^"]*"\\s*/?\\s*>',
    `<meta property="twitter:title" content="${escapeHtml(title)}" />`
  );

  html = replaceMetaContent(
    html,
    '<meta\\s+property="twitter:description"\\s+content="[^"]*"\\s*/?\\s*>',
    `<meta property="twitter:description" content="${escapeHtml(description)}" />`
  );

  return html;
}

/**
 * Main pre-rendering function
 */
function preRenderRoutes() {
  console.log('🚀 Starting SSG pre-rendering for public routes...\n');

  const indexPath = join(DIST_DIR, 'index.html');
  
  if (!existsSync(indexPath)) {
    console.error('❌ Error: dist/index.html not found. Please run build first.');
    process.exit(1);
  }

  const baseHtml = readFileSync(indexPath, 'utf-8');
  let successCount = 0;

  for (const route of PUBLIC_ROUTES) {
    try {
      console.log(`📄 Pre-rendering: ${route.path}`);

      // Inject meta tags for this route
      const html = injectMetaTags(baseHtml, route);

      // Determine output path
      let outputPath;
      if (route.path === '/') {
        outputPath = indexPath;
      } else {
        const routePath = route.path.slice(1); // Remove leading slash
        const routeDir = join(DIST_DIR, routePath);
        mkdirSync(routeDir, { recursive: true });
        outputPath = join(routeDir, 'index.html');
      }

      // Write the pre-rendered HTML
      writeFileSync(outputPath, html, 'utf-8');
      console.log(`   ✅ Generated: ${outputPath.replace(DIST_DIR, 'dist')}\n`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error rendering ${route.path}:`, error.message);
      console.error('');
    }
  }

  console.log('\n📊 Pre-rendering Summary:');
  console.log(`   ✅ Successfully pre-rendered: ${successCount}/${PUBLIC_ROUTES.length} routes`);
  console.log('\n✨ SSG pre-rendering complete!');
}

// Run pre-rendering
preRenderRoutes();
