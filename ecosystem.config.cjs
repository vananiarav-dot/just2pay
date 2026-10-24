module.exports = {
  apps: [
    {
      name: 'just2pay',
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
