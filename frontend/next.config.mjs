/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://fulfilling-healing-production-6a57.up.railway.app/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;