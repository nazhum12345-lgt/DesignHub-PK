// ==============================================================================
// VELORA — PM2 Process Manager Configuration (ecosystem.config.cjs)
// Used for running on VPS (Ubuntu/Debian), Dedicated Servers, and cPanel/Plesk
// Usage:
//   npm run build
//   pm2 start ecosystem.config.cjs --env production
// ==============================================================================

module.exports = {
  apps: [
    {
      name: 'velora-app',
      script: 'server.ts',
      interpreter: 'node_modules/.bin/tsx',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOST: '0.0.0.0',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        HOST: process.env.HOST || '0.0.0.0',
      },
    },
  ],
};
