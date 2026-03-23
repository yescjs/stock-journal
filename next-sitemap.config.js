/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.xn--9z2ba455hkgc.com',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  alternateRefs: [
    { href: 'https://www.xn--9z2ba455hkgc.com/ko', hreflang: 'ko' },
    { href: 'https://www.xn--9z2ba455hkgc.com/en', hreflang: 'en' },
  ],
  additionalPaths: async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js');
    const locales = ['ko', 'en'];
    const paths = [];

    // Static paths with locale prefixes
    const staticPaths = ['/', '/news', '/tools', '/privacy', '/terms', '/refund'];
    for (const locale of locales) {
      for (const staticPath of staticPaths) {
        paths.push({
          loc: `/${locale}${staticPath === '/' ? '' : staticPath}`,
          lastmod: new Date().toISOString(),
          changefreq: 'weekly',
          priority: staticPath === '/' ? 1.0 : 0.8,
        });
      }
    }

    // Dynamic news article paths with locale prefixes
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      const { data } = await supabase
        .from('news_articles')
        .select('id, published_at');
      if (data) {
        for (const article of data) {
          for (const locale of locales) {
            paths.push({
              loc: `/${locale}/news/${article.id}`,
              lastmod: article.published_at,
              changefreq: 'daily',
              priority: 0.7,
            });
          }
        }
      }
    } catch {
      // If Supabase is unavailable, continue with static paths only
    }

    return paths;
  },
};
