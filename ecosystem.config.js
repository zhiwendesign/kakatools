const path = require('path');

module.exports = {
  apps: [
    {
      name: 'kktools',
      script: 'server.js',
      cwd: path.join(__dirname, 'backend'),
      
      // 实例配置
      instances: 1,
      exec_mode: 'fork', // 单实例模式（SQLite 不支持多进程）
      
      // 自动重启配置
      autorestart: true,
      watch: false,
      max_memory_restart: '500M', // 内存超过 500MB 自动重启
      min_uptime: '10s', // 进程运行少于 10 秒视为异常，会重启
      max_restarts: 10, // 最大重启次数
      restart_delay: 4000, // 重启延迟（毫秒）
      
      // 错误处理
      error_file: path.join(__dirname, 'logs', 'error.log'),
      out_file: path.join(__dirname, 'logs', 'out.log'),
      log_file: path.join(__dirname, 'logs', 'combined.log'),
      time: true, // 日志添加时间戳
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true, // 合并日志
      
      // 监控配置
      pmx: true, // 启用 PM2 监控
      
      // 环境变量
      env: {
        NODE_ENV: 'development',
        PORT: 4200
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4200
      },
      
      // 高级配置
      kill_timeout: 5000, // 优雅关闭超时时间
      listen_timeout: 10000, // 启动超时时间
      shutdown_with_message: true, // 使用消息关闭
      
      // 健康检查（如果应用支持）
      // 注意：需要在应用中实现健康检查端点
    }
  ]
};

