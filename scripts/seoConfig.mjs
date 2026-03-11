export { SUPPORTED_LANGUAGES, withLang } from '../src/seo/publicRoutesData.mjs';

import {
  buildLocalizedPublicRoutes,
  PUBLIC_ROUTES as PUBLIC_ROUTE_OBJECTS,
} from '../src/seo/publicRoutesData.mjs';

export const PUBLIC_ROUTES = PUBLIC_ROUTE_OBJECTS.map((r) => r.path);

export const getLanguageRoutes = ({ includeNoIndex = true } = {}) =>
  buildLocalizedPublicRoutes({ includeNoIndex }).map((route) => route.path);
