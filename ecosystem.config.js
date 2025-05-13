module.exports = {
  apps: [
    {
      name: 'fastproxy-backend',
      script: './backend/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8081
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'fastproxy-frontend',
      script: './frontend/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
}; 