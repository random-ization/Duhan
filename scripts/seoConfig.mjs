import {
  SUPPORTED_LANGUAGES,
  PUBLIC_ROUTES as PUBLIC_ROUTE_OBJECTS,
  withLang,
} from '../src/seo/publicRoutesData.mjs';

export { SUPPORTED_LANGUAGES, withLang };

export const PUBLIC_ROUTES = PUBLIC_ROUTE_OBJECTS.map((r) => r.path);

export const getLanguageRoutes = () =>
  SUPPORTED_LANGUAGES.flatMap((lang) => PUBLIC_ROUTES.map((route) => withLang(lang, route)));
