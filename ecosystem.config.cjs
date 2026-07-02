// PM2 Ecosystem config — Mystics Audit
// Usage:
//   pm2 start ecosystem.config.cjs
//   pm2 reload ecosystem.config.cjs --update-env
//   pm2 logs mystics-api
//   pm2 startup   (auto-start on server reboot)
//   pm2 save

const fs   = require("fs");
const path = require("path");

// Read and parse .env.production using only built-in modules (no dotenv needed)
const envFile = path.join(__dirname, ".env.production");
const env = {};

if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = val;
    });
}

module.exports = {
  apps: [
    {
      name: "mystics-audit",
      script: "./artifacts/api-server/dist/index.mjs",

      cwd: __dirname,

      instances: 1,
      exec_mode: "fork",

      env: {
        NODE_ENV: "production",
        PORT:           env.API_PORT      || "3500",
        DATABASE_URL:   env.DATABASE_URL  || "",
        SESSION_SECRET: env.SESSION_SECRET|| "",
        SMTP_HOST:      env.SMTP_HOST     || "",
        SMTP_PORT:      env.SMTP_PORT     || "587",
        SMTP_USER:      env.SMTP_USER     || "",
        SMTP_PASS:      env.SMTP_PASS     || "",
        SMTP_FROM:      env.SMTP_FROM     || "",
      },

      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      restart_delay: 3000,

      out_file:        "./logs/api-out.log",
      error_file:      "./logs/api-error.log",
      merge_logs:      true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
