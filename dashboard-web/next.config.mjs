import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
const rootEnvPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(rootEnvPath)) {
  console.log('Loading root .env file for Next.js...');
  const envContent = fs.readFileSync(rootEnvPath, 'utf-8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        // Only set NEXT_PUBLIC_ variables and specific ones we need
        if (key.startsWith('NEXT_PUBLIC_') || ['FRONTEND_PORT'].includes(key)) {
          process.env[key] = value;
          console.log(`Loaded: ${key} = ${value}`);
        }
      }
    }
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_API_BASE_URL_HTTPS: process.env.NEXT_PUBLIC_API_BASE_URL_HTTPS,
    NEXT_PUBLIC_REFRESH_INTERVAL: process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '18000',
    NEXT_PUBLIC_FLASH_INTERVAL: process.env.NEXT_PUBLIC_FLASH_INTERVAL || '1200',
  },
  webpack: (config, { dev, isServer }) => {
    // Fix chunk loading issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    // Improve chunk loading reliability
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
        },
      },
    };

    return config;
  },
  async rewrites() {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) {
      console.warn('NEXT_PUBLIC_API_BASE_URL not set, API rewrites disabled');
      return [];
    }
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
  images: {
    domains: ['img2.pic.in.th'],
  },
  // Add experimental features to improve stability
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig; 