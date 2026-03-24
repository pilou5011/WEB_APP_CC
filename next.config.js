/** @type {import('next').NextConfig} */
const nextConfig = {
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
