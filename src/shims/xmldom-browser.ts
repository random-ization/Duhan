/**
 * Browser shim for `@xmldom/xmldom`.
 *
 * Our only transitive consumer is `epubjs`, which imports the pure-JS
 * xmldom `DOMParser` but — per `epubjs/src/utils/core.js` and
 * `epubjs/src/section.js` — only falls back to it when the runtime lacks
 * `DOMParser` / `XMLSerializer`. Every browser we ship to has both
 * natives, so xmldom's ~26 kB gzip of DOM parsing code is dead weight
 * in our bundle.
 *
 * This shim is wired in via `resolve.alias` in `vite.config.ts`: any
 * import of `@xmldom/xmldom` resolves here and receives browser globals
 * instead of the 90 kB pure-JS implementation.
 */

// We re-export the browser globals rather than aliasing directly so the
// bundler preserves the named-export ES shape that epubjs expects.

export const DOMParser: typeof globalThis.DOMParser = globalThis.DOMParser;
export const XMLSerializer: typeof globalThis.XMLSerializer = globalThis.XMLSerializer;

// `DOMImplementation` isn't a browser global — it's accessed via
// `document.implementation`. epubjs doesn't import it, but some
// transitive deep-import might, so we provide a matching shape.
export const DOMImplementation: unknown =
  typeof document !== 'undefined' ? document.implementation : undefined;

export default {
  DOMParser,
  XMLSerializer,
  DOMImplementation,
};
