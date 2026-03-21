module.exports = {
  apps: [
    {
      name: "agencia-web-b2b",
      script: ".next/standalone/server.js",
      cwd: "/root/agencia-web-b2b",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      // Health check
      health_check: {
        enabled: true,
        max_memory_restart: "1G",
        max_restarts: 10,
        min_uptime: "10s",
      },
      // Logging
      log_file: "/root/agencia-web-b2b/logs/combined.log",
      out_file: "/root/agencia-web-b2b/logs/out.log",
      error_file: "/root/agencia-web-b2b/logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
