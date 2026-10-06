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
  webpack: (config, { isServer }) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      // Supabase Realtime : require dynamique → bruit webpack sans impact fonctionnel
      { module: /@supabase[\\/]realtime-js/ },
    ];
    // exceljs (export Inventaire) : modules Node non disponibles côté navigateur
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        stream: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
