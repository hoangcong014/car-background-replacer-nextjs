/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pictures.porsche.com',
      },
      {
        protocol: 'https',
        hostname: 'resource-3.vcat.ai',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@google/genai'],
  },
}

module.exports = nextConfig