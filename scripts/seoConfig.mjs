export const SUPPORTED_LANGUAGES = ['en', 'zh', 'vi', 'mn'];

export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/pricing',
  '/terms',
  '/privacy',
  '/refund',
  '/forgot-password',
];

export const withLang = (lang, route) => {
  if (route === '/') return `/${lang}`;
  return `/${lang}${route}`;
};

export const getLanguageRoutes = () =>
  SUPPORTED_LANGUAGES.flatMap(lang => PUBLIC_ROUTES.map(route => withLang(lang, route)));

