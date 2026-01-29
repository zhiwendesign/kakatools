# KKTools 监控和运维指南

## 📊 监控功能

### 健康检查端点

访问 `/api/health` 获取服务器健康状态：

```bash
curl http://localhost:4200/api/health
```

返回信息包括：
- 服务器状态（healthy/degraded/unhealthy）
- 数据库连接状态
- 内存使用情况
- 运行时间
- 请求统计信息
- Node.js 版本和平台信息

### PM2 监控

#### 查看进程状态
```bash
pm2 status
```

#### 查看实时日志
```bash
pm2 logs kktools
```

#### 查看实时监控面板
```bash
pm2 monit
```

#### 查看详细信息
```bash
pm2 describe kktools
```

## 🔧 常用命令

### 启动服务
```bash
# 使用 PM2（推荐）
cd backend
./start.sh

# 或直接使用 PM2
pm2 start ecosystem.config.js
```

### 停止服务
```bash
pm2 stop kktools
```

### 重启服务
```bash
pm2 restart kktools
```

### 删除进程
```bash
pm2 delete kktools
```

### 保存 PM2 配置
```bash
pm2 save
pm2 startup  # 设置开机自启
```

## 📈 性能监控

### 内存监控

服务器会自动监控内存使用情况：
- 每 5 分钟输出内存使用情况
- 内存使用超过 80% 时会发出警告
- PM2 会在内存超过 500MB 时自动重启

### 请求统计

健康检查端点包含以下统计信息：
- 总请求数
- 成功请求数
- 错误请求数
- 慢请求数（>1秒）
- 每分钟请求数
- 错误率

### 慢请求监控

超过 1 秒的请求会自动记录到日志，格式：
```
⚠️  [SLOW REQUEST] {"timestamp":"...","method":"POST","path":"/api/...","duration":"1500ms",...}
```

## 🛡️ 安全特性

### 请求限流

- 每个 IP 地址每分钟最多 100 个请求
- 超过限制返回 429 状态码
- 健康检查端点不受限流影响

### 请求超时

- 所有请求超时时间：30 秒
- 超时请求返回 408 状态码

### 错误处理

- 全局错误捕获，防止进程崩溃
- 详细的错误日志记录
- 数据库连接自动恢复

## 📝 日志管理

### 日志文件位置

PM2 日志文件位于 `logs/` 目录：
- `error.log` - 错误日志
- `out.log` - 标准输出日志
- `combined.log` - 合并日志

### 日志轮转

建议使用 PM2 的日志轮转功能：

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 🔍 故障排查

### 服务无法启动

1. 检查端口是否被占用：
```bash
lsof -ti:4200
```

2. 检查数据库文件权限：
```bash
ls -la backend/data/kktools.db
```

3. 查看 PM2 日志：
```bash
pm2 logs kktools --err
```

### 数据库连接问题

1. 检查数据库文件是否存在
2. 检查文件权限
3. 查看数据库健康状态：
```bash
curl http://localhost:4200/api/health | jq .database
```

### 内存泄漏

1. 监控内存使用：
```bash
pm2 monit
```

2. 查看内存趋势：
```bash
pm2 describe kktools | grep memory
```

3. 如果内存持续增长，重启服务：
```bash
pm2 restart kktools
```

### 高 CPU 使用

1. 查看 CPU 使用情况：
```bash
pm2 monit
```

2. 检查慢请求：
```bash
pm2 logs kktools | grep "SLOW REQUEST"
```

3. 分析请求统计：
```bash
curl http://localhost:4200/api/health | jq .statistics
```

## 🚨 告警建议

### 设置告警阈值

建议监控以下指标：

1. **内存使用率 > 80%**
   - 检查是否有内存泄漏
   - 考虑增加内存限制或优化代码

2. **错误率 > 5%**
   - 检查错误日志
   - 分析错误原因

3. **慢请求数 > 10/小时**
   - 优化数据库查询
   - 检查网络延迟

4. **数据库连接失败**
   - 检查数据库文件
   - 检查磁盘空间

### 使用外部监控工具

可以集成以下监控工具：
- **PM2 Plus** - PM2 官方监控服务
- **Grafana** - 可视化监控面板
- **Prometheus** - 指标收集
- **Sentry** - 错误追踪

## 📊 性能优化建议

1. **定期清理日志**：避免日志文件过大
2. **数据库优化**：定期执行 VACUUM
3. **监控慢查询**：优化数据库查询
4. **缓存策略**：对频繁访问的数据使用缓存
5. **CDN 加速**：静态资源使用 CDN

## 🔄 自动重启策略

PM2 配置了以下自动重启策略：

- **内存限制**：超过 500MB 自动重启
- **最小运行时间**：运行少于 10 秒视为异常
- **最大重启次数**：10 次后停止重启
- **重启延迟**：4 秒延迟避免频繁重启

## 📞 支持

如果遇到问题，请：
1. 查看日志文件
2. 检查健康检查端点
3. 查看 PM2 状态
4. 联系技术支持

