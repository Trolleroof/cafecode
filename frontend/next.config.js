const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        path: false,
        os: false,
        http: false,
        https: false,
        zlib: false,
      };
    }

    // Monaco Editor webpack plugin setup
    if (!isServer) {
      config.plugins.push(new MonacoWebpackPlugin({
        languages: ['javascript', 'python', 'html', 'css', 'json'],
        filename: 'static/[name].worker.js',
      }));
    }

    return config;
  },
};

module.exports = nextConfig;