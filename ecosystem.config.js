module.exports = {
  apps: [
    {
      name: 'braille-typing-backend',
      script: './backend/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        HOST: '0.0.0.0'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 4000,
        HOST: '0.0.0.0'
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // PM2+ monitoring
      pmx: true,
      // Auto restart on crash
      min_uptime: '10s',
      max_restarts: 10,
      // Memory and CPU limits
      kill_timeout: 3000,
      listen_timeout: 3000,
      // Graceful shutdown
      shutdown_with_message: true
    },
    {
      name: 'braille-typing-frontend',
      script: 'npx',
      args: 'http-server -p 8080 -a 0.0.0.0 --cors',
      cwd: './frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      env_development: {
        NODE_ENV: 'development'
      },
      log_file: './logs/frontend-combined.log',
      out_file: './logs/frontend-out.log',
      error_file: './logs/frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};