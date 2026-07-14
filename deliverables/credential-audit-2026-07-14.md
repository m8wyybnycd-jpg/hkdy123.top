# 凭证集中管理系统 — 全面代码审计报告

**审计日期**: 2026-07-14
**审计范围**: 凭证管理全链路（加密/存储/读取/保活/审计/前端API）
**审计文件**: 11个核心文件，约2200行代码

---

## 审计发现汇总

| 优先级 | 数量 | 类别 |
|--------|------|------|
| P0 (严重) | 3 | 逻辑错误/功能缺失 |
| P1 (高) | 4 | 安全隐患/数据一致性 |
| P2 (中) | 4 | 性能/边界情况 |
| P3 (低) | 4 | 代码质量/可维护性 |

---

## P0 — 严重（必须立即修复）

### P0-1: OAuth 令牌续期未持久化到 D1
- **文件**: `keepalive-worker/src/index.ts` L337-340
- **问题**: `renewOAuthToken()` 成功调用续期端点并收到新 `access_token`/`refresh_token`，但仅 `console.log` 记录成功，未重新加密并写回 D1。下次健康检查仍使用旧令牌。
- **影响范围**: 所有 `type=oauth` 且 `auto_renew=1` 的凭证。续期形同虚设，OAuth 令牌过期后服务中断。
- **修复目标**: 在 Worker 中引入 `encryptCredential` 函数，续期成功后加密新令牌并 UPDATE D1，同时记录审计日志。

### P0-2: `maskCredential("[encrypted]")` 产生无意义输出
- **文件**: `functions/api/admin/credentials.ts` L60, `functions/api/admin/credentials/[id].ts` L32
- **问题**: `toCredentialDTO()` 传入字面量 `"[encrypted]"` 给 `maskCredential()`，而非实际凭证值。管理员看到的掩码预览是 `***pted]`，毫无意义。
- **影响范围**: 后台凭证列表和详情页的所有凭证显示。
- **修复目标**: 不在列表/详情接口中解密（安全要求），改为返回固定标识 `"******"` 或解密后掩码再丢弃明文。

### P0-3: Worker 健康检查将 404 视为"健康"（假阳性）
- **文件**: `keepalive-worker/src/index.ts` L274
- **问题**: `healthy = resp.status >= 200 && resp.status < 500`，404 被视为健康。对 MaaS `/models` 端点来说，404 只说明端点不存在，不能证明 API Key 有效。
- **影响范围**: 所有 api_key 类型凭证的自动化健康检查。失效的 API Key 可能被误报为健康。
- **修复目标**: 将健康阈值统一为 `>= 200 && < 400`，与 admin 手动测试保持一致。401/403 标记为认证失败，404+ 标记为端点异常。

---

## P1 — 高（本轮修复）

### P1-1: 错误吞噬 — catch 块丢失错误信息
- **文件**: `credentials.ts` L184, L207; `[id].ts` L208
- **问题**: 多处 `catch { return serverError("xxx失败"); }` 未记录原始错误，排障困难。
- **影响范围**: 凭证创建/查询/更新失败时无法定位根因。
- **修复目标**: catch 块增加 `console.error` 记录原始错误，再返回用户友好消息。

### P1-2: PUT 更新未检查名称唯一性
- **文件**: `functions/api/admin/credentials/[id].ts` L126-129
- **问题**: 更新凭证名称时不检查是否与其他凭证重名，可创建重复名称。
- **影响范围**: 凭证数据一致性。
- **修复目标**: PUT 中如果 `body.name` 变更，查询 `WHERE name = ? AND id != ?`，存在则返回 409。

### P1-3: 健康检查状态码阈值不一致
- **文件**: Worker `index.ts` L274 (`< 500`) vs admin `test.ts` L154 (`< 400`)
- **问题**: 同一凭证在手动测试和自动巡检中可能产生不同的健康判定。
- **影响范围**: 运维判断混乱。
- **修复目标**: 统一为 `< 400`，已在 P0-3 中一并修复。

### P1-4: `/trigger` 端点无速率限制
- **文件**: `keepalive-worker/src/index.ts` L572-603
- **问题**: 仅有 Bearer Token 认证，无速率限制。Token 泄露后可被暴力触发，消耗 Worker 执行时间。
- **影响范围**: Worker 资源安全。
- **修复目标**: 基于 IP 的简单速率限制（如 5分钟内最多 3 次触发），或记录最近触发时间拒绝频繁调用。

---

## P2 — 中（建议修复）

### P2-1: 顺序健康检查可能超时
- **文件**: `keepalive-worker/src/index.ts` L431-506
- **问题**: `for` 循环顺序检查所有凭证，每个最多 10s 超时。50 个凭证最坏情况 500s。
- **影响范围**: 凭证数量增长后 Worker 执行时间可能超出限制。
- **修复目标**: 使用 `Promise.all` 并发检查（限制并发数 5-10），或分批处理。

### P2-2: 凭证列表无分页
- **文件**: `functions/api/admin/credentials.ts` L198-200
- **问题**: `SELECT * FROM credentials ORDER BY created_at DESC` 返回全部行，无 LIMIT/OFFSET。
- **影响范围**: 凭证数量多时响应缓慢。
- **修复目标**: 支持 `?page=1&pageSize=20` 查询参数。

### P2-3: `credential_health_logs` 无清理策略
- **文件**: keepalive Worker 每次 cron 运行都 INSERT 日志，无 DELETE/归档。
- **影响范围**: D1 存储增长。
- **修复目标**: 每次 cron 结束后删除 30 天前的日志，或保留最近 1000 条。

### P2-4: `getCredentialByProvider()` 静默回退
- **文件**: `functions/lib/credential.ts` L247-248
- **问题**: D1 解密失败时静默返回 `fallbackEnv`，错误不可见。
- **影响范围**: D1 凭证损坏时无感知，一直在用环境变量降级。
- **修复目标**: catch 块增加 `console.error`，返回 fallback 但记录告警。

---

## P3 — 低（后续优化）

### P3-1: PBKDF2 盐值硬编码
- **文件**: `functions/lib/credential.ts` L58
- **问题**: 盐值 `"cloudgame-hub-credential-encryption-v1"` 硬编码。若 `JWT_SECRET` 变更，所有已加密凭证不可解密。
- **修复目标**: 文档记录此约束，变更 JWT_SECRET 前需重新加密所有凭证。

### P3-2: `/trigger` 使用 mock 对象调用 `this.scheduled()`
- **文件**: `keepalive-worker/src/index.ts` L591-594
- **问题**: `as unknown as ScheduledEvent` 类型转换脆弱。
- **修复目标**: 将核心逻辑抽取为独立函数，scheduled 和 trigger 都调用它。

### P3-3: `[id].ts` 中 `getOperator` 重复定义
- **文件**: `credentials.ts` L29-39 vs `[id].ts` 内联
- **问题**: 代码重复。
- **修复目标**: 提取到共享 lib。

### P3-4: GET 查看凭证未记录审计日志
- **文件**: `credentials.ts` GET handler, `[id].ts` GET handler
- **问题**: 安全要求"操作日志可追溯"，但查看凭证未记录。
- **修复目标**: 增加 `logOperation` for GET (可选，按需启用)。

---

## 修复计划

| 轮次 | 优先级 | 问题数 | 说明 |
|------|--------|--------|------|
| 第一轮 | P0 | 3 | 核心功能修复 |
| 第二轮 | P1 | 4 | 安全+一致性修复 |
| 第三轮 | P2 | 4 | 性能+边界修复 |
| 后续 | P3 | 4 | 代码质量优化 |

---

## 验证方法

1. **P0-1**: 创建 OAuth 类型凭证 → 模拟续期 → 检查 D1 中 `encrypted_value` 是否更新
2. **P0-2**: GET /api/admin/credentials → 检查 `maskedValue` 字段是否显示合理的掩码
3. **P0-3**: 对不存在端点的凭证执行健康检查 → 确认返回 unhealthy
4. **P1-2**: PUT 更新凭证名为已有名称 → 确认返回 409
5. **tsc --noEmit + vite build** 全绿
