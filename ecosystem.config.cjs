// PM2 Ecosystem config — Mystics Audit
// Usage:
//   pm2 start ecosystem.config.cjs
//   pm2 reload ecosystem.config.cjs --update-env
//   pm2 logs mystics-api
//   pm2 startup   (auto-start on server reboot)
//   pm2 save

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env.production") });

module.exports = {
  apps: [
    {
      name: "mystics-api",
      script: "./artifacts/api-server/dist/index.mjs",

      // Run from repo root so relative paths resolve correctly
      cwd: "/home/automystics-mysticsaudit/htdocs/mysticsaudit.automystics.tech",

      // Cluster mode — one process per CPU core (remove if DB connections spike)
      instances: 1,
      exec_mode: "fork",

      // Environment — values must also be set in .env.production
      env: {
        NODE_ENV: "production",
        PORT: process.env.API_PORT || "8080",
        DATABASE_URL: process.env.DATABASE_URL,
        SESSION_SECRET: process.env.SESSION_SECRET,
        SMTP_HOST: process.env.SMTP_HOST || "",
        SMTP_PORT: process.env.SMTP_PORT || "587",
        SMTP_USER: process.env.SMTP_USER || "",
        SMTP_PASS: process.env.SMTP_PASS || "",
        SMTP_FROM: process.env.SMTP_FROM || "",
      },

      // Restart policy
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      restart_delay: 3000,

      // Logs
      out_file: "./logs/api-out.log",
      error_file: "./logs/api-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
