/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** ESM en cliente; no listar junto a serverComponentsExternalPackages (conflicto Next 14). */
  transpilePackages: ["colorthief"],
  experimental: {
    optimizePackageImports: ["recharts"],
    /** sharp usado por colorthief en Node: no empaquetar el binario. */
    serverComponentsExternalPackages: ["sharp"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/uploads/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "4000", pathname: "/uploads/**" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com", pathname: "/**" },
      { protocol: "https", hostname: "**.amazonaws.com", pathname: "/**" },
    ],
  },
  async redirects() {
    return [
      { source: "/favoritos", destination: "/eventos", permanent: false },
      { source: "/perfil", destination: "/mis-entradas", permanent: false },
      { source: "/local", destination: "/dashboard", permanent: false },
      { source: "/local/:path*", destination: "/dashboard", permanent: false },
      { source: "/dashboard/reportes", destination: "/dashboard/estadisticas", permanent: false },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Caché en disco de webpack en Windows + transpilePackages suele corromperse
      // (ENOENT vendor-chunks, GET /_next/static/... 404). Memoria evita PackFileCache rotos.
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;
