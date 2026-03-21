module.exports = {
  apps: [
    {
      name: "agencia-web",
      script: "npm",
      args: "start",
      cwd: "/root/apps/agencia",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
