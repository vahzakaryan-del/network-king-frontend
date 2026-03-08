/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  
  async rewrites() {
    return [
      {
        source: "/badges/:path*",
        destination: "https://networkking.app/badges/:path*",
      },
      {
        source: "/avatars/:path*",
        destination: "https://networkking.app/avatars/:path*",
      },
      
    ];
  },
};

export default nextConfig;