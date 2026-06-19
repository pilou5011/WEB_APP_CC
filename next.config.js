/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/landing', destination: '/', permanent: true },
      { source: '/landing/', destination: '/', permanent: true },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      // Supabase Realtime : require dynamique → bruit webpack sans impact fonctionnel
      { module: /@supabase[\\/]realtime-js/ },
    ];
    return config;
  },
};

module.exports = nextConfig;
