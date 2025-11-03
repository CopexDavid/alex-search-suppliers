/** @type {import('next').NextConfig} */
const config = {
  // Убираем standalone для правильной работы статических файлов
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Настройки для продакшена
  poweredByHeader: false,
  compress: true,
  // Настройки для статических файлов
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  trailingSlash: false,
}

module.exports = config

