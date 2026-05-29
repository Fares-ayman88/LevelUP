module.exports = {
  apps: [
    {
      name: 'levelup-auth-api',
      script: 'server/auth-api/src/server.js',
      cwd: process.env.APP_DIR || '/var/www/levelup/web-react',
      exec_mode: 'cluster',
      instances: process.env.WEB_CONCURRENCY || 'max',
      node_args: '--enable-source-maps',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 8090,
      },
      max_memory_restart: '512M',
      kill_timeout: 10000,
      listen_timeout: 10000,
      exp_backoff_restart_delay: 200,
      merge_logs: true,
      error_file: 'server/auth-api/logs/pm2-error.log',
      out_file: 'server/auth-api/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
