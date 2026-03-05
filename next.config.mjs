/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      // Badges → backend
      {
        source: "/badges/:path*",
        destination: "http://localhost:4000/badges/:path*",
      },

      // Avatars → backend
      {
        source: "/avatars/:path*",
        destination: "http://localhost:4000/avatars/:path*",
      },

    ];
  },
};

export default nextConfig;