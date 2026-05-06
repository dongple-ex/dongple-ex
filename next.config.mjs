/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'tong.visitkorea.or.kr',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'tong.visitkorea.or.kr',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'k.kakaocdn.net',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 't1.kakaocdn.net',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'yjkkjdjaqkcnijpcrwtf.supabase.co',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                pathname: '**',
            }
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
