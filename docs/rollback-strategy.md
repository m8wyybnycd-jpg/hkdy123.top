# 回滚策略

## 方案 1: Cloudflare Pages 原生回滚（推荐）

Cloudflare Pages 保留每次部署的历史记录，可通过 Dashboard 或 API 一键回滚。

### 通过 Dashboard 回滚
1. 访问 Cloudflare Dashboard → Pages → cloudgame-hub
2. 在 Deployments 列表中找到上一个稳定版本
3. 点击 "Rollback to this deployment"

### 通过 API 回滚
```bash
# 列出最近的部署
curl -X GET "https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/cloudgame-hub/deployments" \
  -H "Authorization: Bearer {api_token}"

# 回滚到指定部署
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/cloudgame-hub/deployments/{deployment_id}/rollback" \
  -H "Authorization: Bearer {api_token}"
```

## 方案 2: Git revert 回滚

```bash
# 查看最近的部署提交
git log --oneline -10

# 回滚到指定提交
git revert <commit_hash>
git push origin main  # 触发 CI/CD 自动重新部署
```

## 方案 3: D1 数据库回滚

D1 支持时间点恢复（Point-in-Time Recovery）：

```bash
# 列出可用的备份
wrangler d1 backups list cloudgame-hub-db

# 恢复到指定时间点
wrangler d1 backups restore cloudgame-hub-db --timestamp "2026-07-10T10:00:00Z"
```

## 回滚检查清单

- [ ] 确认回滚目标版本（哪个部署是稳定的）
- [ ] 通知团队成员回滚操作
- [ ] 执行回滚
- [ ] 验证核心功能：首页加载、登录、注册、API 响应
- [ ] 检查错误率是否恢复正常
- [ ] 记录回滚原因和时间

## 触发回滚的条件

- P0 缺陷导致核心功能不可用（登录、注册、首页）
- 错误率超过 5%
- 响应时间超过 3 秒
- 安全漏洞被利用

## 注意事项

- Cloudflare Pages 回滚是即时的，不需要重新构建
- D1 回滚需要谨慎，可能导致数据不一致
- 回滚后应尽快修复问题并重新部署
