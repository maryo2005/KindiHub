/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permitir subida de archivos grandes (videos, audios)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
