const path = require('path');

module.exports = {
  apps: [
    {
      name: 'kktools',
      script: 'server.js',
      cwd: path.join(__dirname, 'backend'),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4200
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4200
      }
    }
  ]
};

