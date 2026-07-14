# 凭证集中管理 + 保活系统 — 交付总览

> 日期：2026-07-15 | 最终 commit: `d50da9d`

## 目标回顾

将宠物相关的所有权限管理功能集成到后台系统中，由后台统一集中控制：
1. 权限集中管理 — 凭证统一迁移至后台 D1 加密存储
2. 保活机制 — 自动续期、异常重连、状态监控
3. 权限类型扩展 — API Key / Token / OAuth / Certificate
4. 安全性 — 加密存储 + 安全通道 + 操作日志可追溯

## 完成状态

### 1. 权限集中管理 ✅
- D1 `credentials` 表集中存储所有凭证（AES-GCM 256 加密）
- 前端不直接持有任何 API Key / Token
- `pet/chat.ts` 从 D1 读取凭证（env fallback 作为降级）
- **关键 bug 修复**：`credential.ts` 中 3 处 SELECT 查询使用 `iv` 而非 `encryption_iv`，导致 D1 解密始终失败 → 修复后 round-trip 验证通过

### 2. 保活机制 ✅
- **独立 Cloudflare Worker**：`cloudgame-hub-keepalive`
  - 地址：https://cloudgame-hub-keepalive.guorizi.workers.dev
  - Cron Trigger：`*/30 * * * *`（每 30 分钟自动健康检查）
- **健康检查逻辑**：
  - api_key/token → 端点连通性 + Bearer 认证验证
  - oauth → 过期检查 + 自动续期（via renew_endpoint）
  - certificate → 过期日期检查
- **重试机制**：指数退避（2s → 4s），最多 2 次重试
  - 401/403 不重试（认证无效）
  - 证书过期不重试
- **状态管理**：
  - 连续 3 次失败 → 标记 `error`
  - 恢复成功 → 重置 `failure_count` 为 0
  - 每次检查写入 `credential_health_logs` 表
- **HTTP 端点**：
  - `GET /health` — Worker 自身存活
  - `GET /status` — 凭证健康摘要 + 最近 20 条日志
  - `POST /trigger` — 手动触发（Bearer token 保护）

### 3. 权限类型扩展 ✅
四种凭证类型全覆盖：
| 类型 | 存储 | 健康检查 | 自动续期 |
|------|------|----------|----------|
| api_key | AES-GCM 加密 | 端点连通性 + Bearer 认证 | N/A |
| token | AES-GCM 加密 | 端点连通性 + Bearer 认证 | N/A |
| oauth | AES-GCM 加密 | 过期检查 + 端点验证 | ✅ via renew_endpoint |
| certificate | AES-GCM 加密 | 过期日期检查 | N/A |

### 4. 安全性 ✅
- **加密存储**：AES-GCM 256-bit + PBKDF2 (100K iterations) 密钥派生
- **传输安全**：全程 HTTPS（Cloudflare TLS）
- **操作审计**：`credential_audit_logs` 表记录所有 CRUD 操作
- **RBAC 权限**：`credential:view` + `credential:manage` 权限码
- **脱敏展示**：API 响应不返回 `encrypted_value` / `encryption_iv`，仅展示前缀+后缀
- **手动触发保护**：`/trigger` 端点需 Bearer token 认证

## 提交历史

| Commit | 描述 |
|--------|------|
| `57af7fd` | feat: 凭证集中管理系统（13 files, +2126 lines） |
| `6f844c4` | temp: 临时种子端点将 xfyun API Key 录入 D1 |
| `717e80d` | fix: `iv` → `encryption_iv` 列名修复（3处 SELECT + 3处 row 访问） |
| `1648784` | feat: keepalive Worker + test.ts 修复 + D1 failure_count 迁移 |
| `d50da9d` | chore: 清理临时 seed 端点 |

## 部署信息

| 组件 | 地址/位置 |
|------|-----------|
| 主站 | https://www.hkdy123.top |
| 凭证管理后台 | https://www.hkdy123.top/admin/credentials |
| 保活 Worker | https://cloudgame-hub-keepalive.guorizi.workers.dev |
| Worker 状态 | https://cloudgame-hub-keepalive.guorizi.workers.dev/status |
| D1 数据库 | cloudgame-hub-db (1e65f62f-e7a3-4a89-88eb-f34c95f4969c) |

## D1 凭证记录

| id | name | provider | type | status |
|----|------|----------|------|--------|
| 2 | 讯飞MaaS 混元7B | xfyun | api_key | active |

## Worker Secrets

| Secret | 用途 |
|--------|------|
| JWT_SECRET | 凭证解密（与主站相同） |
| KEEPALIVE_ADMIN_TOKEN | /trigger 端点认证 |

## 注意事项

- Cron 首次触发可能需要等待最多 30 分钟
- 手动触发：`POST /trigger` with `Authorization: Bearer <KEEPALIVE_ADMIN_TOKEN>`
- OAuth 自动续期目前仅完成调用 renew_endpoint + 日志记录，新 token 的重新加密写回 D1 需后续完善（TODO 标记在 index.ts line 337-340）
