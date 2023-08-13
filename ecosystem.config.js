module.exports = {
  apps: [
    {
      script: './dist/main.js',
      exec_mode: 'cluster',
      instances: 0,
      env_development: {
        name: 'development-numberbaseball-api',
        NODE_ENV: 'dev',
      },
      env_production: {
        name: 'production-numberbaseball-api',
        NODE_ENV: 'prod',
      },
    },
  ],
};
