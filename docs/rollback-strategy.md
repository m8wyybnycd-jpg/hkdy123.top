# 回滚策略 (Rollback Strategy)

## 前端回滚 (Cloudflare Pages)

### 方法 1：通过 Cloudflare Dashboard 回滚
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 Pages → cloudgame-hub → Deployments
3. 找到上一个稳定版本 (V12.0) 的 deployment
4. 点击 "Rollback to this deployment" 按钮
5. 等待 1-2 分钟，DNS 缓存刷新后生效

### 方法 2：通过 Wrangler CLI 回滚
```bash
# 列出最近的部署
wrangler pages deployment list --project-name=cloudgame-hub

# 重新部署指定版本的 dist 目录
wrangler pages deploy dist --project-name=cloudgame-hub
```

### 方法 3：Git Revert + 重新部署
```bash
# 查看最近的提交
git log --oneline -10

# 回退到 V12.0 的提交
git revert <v12-commit-hash>
git push origin main

# CI/CD 会自动触发重新部署（如已配置）
# 或手动部署：
npm run deploy
```

## 数据库回滚 (D1)

### SC-04: 索引回滚
```bash
# 恢复已删除的索引（如需要）
npx wrangler d1 execute cloudgame-hub-db --remote \
  --command="CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"
```

### 数据回滚
```bash
# 从备份恢复（备份文件在 backups/ 目录）
npx wrangler d1 execute cloudgame-hub-db --remote \
  --file=backups/backup-YYYY-MM-DDTHH-MM-SS.sql
```

## Functions 回滚

Cloudflare Pages Functions 随前端一起部署，回滚前端部署即可同时回滚 Functions。

## 紧急回滚步骤

1. **确认问题**：在生产环境复现问题，确认需要回滚
2. **通知用户**：通过公告系统或社交媒体通知用户维护中
3. **执行回滚**：通过 Cloudflare Dashboard 一键回滚到 V12.0
4. **验证**：访问关键页面确认功能正常
5. **排查**：在本地环境复现问题，修复后重新部署

## 回滚检查清单

- [ ] 前端页面正常加载
- [ ] 登录/注册功能正常
- [ ] API 接口响应正常
- [ ] 管理后台可访问
- [ ] 数据库查询无异常
