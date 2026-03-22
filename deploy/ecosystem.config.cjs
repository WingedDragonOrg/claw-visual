module.exports = {
  apps: [
    {
      name: 'claw-visual',
      script: 'src/index.ts',
      cwd: '/home/ubuntu/apps/claw-visual/packages/server',
      interpreter: '/home/ubuntu/.bun/bin/bun',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '/home/ubuntu/apps/claw-visual/.env',
      error_file: '/home/ubuntu/.pm2/logs/claw-visual-error.log',
      out_file: '/home/ubuntu/.pm2/logs/claw-visual-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Crash restart config
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
