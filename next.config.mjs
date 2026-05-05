/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'tong.visitkorea.or.kr',
      },
      {
        protocol: 'https',
        hostname: 'tong.visitkorea.or.kr',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/v2',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
