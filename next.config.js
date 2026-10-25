/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    // each guide's Markdown lives next to its page: /guides/<slug>.md
    return [{ source: '/guides/:slug.md', destination: '/guides-md/:slug' }];
  },
};

module.exports = nextConfig;
