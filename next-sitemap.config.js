/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.xn--9z2ba455hkgc.com', // 꼭 punycode 사용!
  generateRobotsTxt: true,
  sitemapSize: 7000,
  additionalPaths: async (config) => {
    const { createClient } = require('@supabase/supabase-js');
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      const { data } = await supabase
        .from('news_articles')
        .select('id, published_at');
      if (!data) return [];
      return data.map((article) => ({
        loc: `/news/${article.id}`,
        lastmod: article.published_at,
        changefreq: 'daily',
        priority: 0.7,
      }));
    } catch {
      return [];
    }
  },
};
