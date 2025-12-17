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
  
  // Настройки в зависимости от окружения
  ...(process.env.NODE_ENV === 'production' ? {
    // Настройки для продакшена
    poweredByHeader: false,
    compress: true,
    assetPrefix: '',
    trailingSlash: false,
  } : {
    // Настройки для разработки
    poweredByHeader: true,
    compress: false,
    // Включаем hot reload и fast refresh
    reactStrictMode: true,
    // Отключаем минификацию в dev режиме для лучшего дебага
    swcMinify: false,
  }),

  // Общие настройки
  experimental: {
    // Включаем server components
    serverComponentsExternalPackages: ['puppeteer'],
  },
  
  // Настройки для работы с внешними доменами (если нужно)
  images: {
    domains: ['alexautozakup'],
  },
}

module.exports = config

