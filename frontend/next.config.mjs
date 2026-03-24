/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build errors ko ignore karne ke liye (Deployment fast karne ke liye)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // External images allow karne ke liye
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },

  // API Rewrites logic
  async rewrites() {
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // Error fix: Agar URL 'http' se start nahi ho raha toh 'https://' add karo
    if (!apiUrl.startsWith('http')) {
      apiUrl = `https://${apiUrl}`;
    }

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;