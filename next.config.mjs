/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Solana wallet adapters reference optional native deps; ignore them in the browser bundle.
    config.externals = config.externals || [];
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
