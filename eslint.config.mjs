// ESLint 9+ flat config para Next 16 (que removeu `next lint`).
// `eslint-config-next` exporta um array de configs; basta spread.

import nextConfig from 'eslint-config-next'

const config = [
  ...nextConfig,
  {
    ignores: [
      '.next/**',
      'out/**',
      'node_modules/**',
      'public/sw.js',
      'public/workbox-*.js',
      'public/swe-worker-*.js',
    ],
  },
  {
    rules: {
      // O projeto usa <img> com URLs externas (Open Library, Google Books,
      // Supabase Storage, etc) e ainda nao definiu remotePatterns no
      // next.config.ts. Migracao para next/image fica como follow-up
      // separado quando a pol\u00edtica de hosts/CDN for definida.
      '@next/next/no-img-element': 'off',
    },
  },
]

export default config
