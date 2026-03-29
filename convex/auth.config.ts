export default {
  providers: [
    {
      domain:
        process.env.CONVEX_SITE_URL ||
        process.env.VITE_CONVEX_SITE_URL ||
        process.env.CONVEX_URL ||
        process.env.VITE_CONVEX_URL,
      applicationID: 'convex',
    },
  ],
};
