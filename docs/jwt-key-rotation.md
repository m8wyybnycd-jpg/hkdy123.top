# JWT 密钥安全轮换 Runbook（双密钥过渡）

> 适用项目：cloudgame-hub（Cloudflare Pages + Functions）
> 相关代码：`functions/lib/auth.ts` 的 `getJWTSecrets()` + `verifyJWTAny()`
> 目的：轮换 `JWT_SECRET` 时，**不踢掉任何在线用户**——旧密钥签发的令牌在过渡期内依然有效。

---

## 1. 解决的问题

2026-07-11 一次 `JWT_SECRET` 轮换导致所有已登录会话瞬间失效（用户被强制退回登录页，
即此前上报的"回归"）。根因：验证端只认主密钥，密钥一变，旧令牌全部验签失败。

双密钥机制：验证时依次尝试 `JWT_SECRET`（主）与 `JWT_SECRET_OLD`（旧）。
轮换时先把旧值存进 `JWT_SECRET_OLD`，再换主密钥——旧会话靠 OLD 继续存活，
新登录用新密钥，过渡期结束后删掉 OLD 即可。

> 当前线上 `JWT_SECRET_OLD` 为空，验证逻辑等价于单密钥（**行为无变化**，可放心先上线）。

---

## 2. 前置条件

- Cloudflare 账户 ID：`8fc74b1b5b23a08f0f22d490184f371a`
- Pages 项目名：`cloudgame-hub`
- 具备 `pages:edit` 权限的 CF API Token（即 GitHub Secrets 中的 `CLOUDFLARE_API_TOKEN`）
- **当前 `JWT_SECRET` 的明文值**（轮换时必须把它写入 `JWT_SECRET_OLD`）。
  CF API 对 secret 值掩码返回，无法直接读取，需从以下任一来源取得：
  - 你生成该密钥时的本地留存 / 密码管理器
  - Cloudflare Dashboard → Pages → cloudgame-hub → Settings → Environment variables 中复制当前值

---

## 3. 安全轮换流程（3 步，零掉线）

### Step A — 生成新密钥
```bash
NEW_SECRET=$(openssl rand -hex 48)   # 96 位十六进制，与现有格式一致
echo "$NEW_SECRET"                    # 留存备份
```

### Step B — 应用双密钥配置（关键：先设 OLD 再换主）
必须**同一请求**把 `JWT_SECRET_OLD=当前值` 与 `JWT_SECRET=新值` 一起写入，
且保留其余环境变量（`BREVO_API_KEY` 等）。下方脚本会自动 GET 现有配置并合并，避免误删。

```bash
ACCOUNT_ID="8fc74b1b5b23a08f0f22d490184f371a"
PROJECT="cloudgame-hub"
TOKEN="<你的 CLOUDFLARE_API_TOKEN>"
OLD_SECRET="<当前 JWT_SECRET 明文值>"   # 来自第 2 节来源
NEW_SECRET="$(openssl rand -hex 48)"

# 1) 拉取现有项目配置
curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}" \
  -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" > /tmp/project.json

# 2) 合并 env_vars：保留现有变量，写入双密钥
jq --arg old "$OLD_SECRET" --arg new "$NEW_SECRET" \
  '.deployment_configs.production.env_vars
     + { JWT_SECRET: { value: $new }, JWT_SECRET_OLD: { value: $old } }' \
  /tmp/project.json > /tmp/new_envvars.json

# 3) 仅回写 production.env_vars（不动其他配置）
jq --slurpfile ev /tmp/new_envvars.json \
  '. + { deployment_configs: { production: { env_vars: $ev[0] } } }' \
  /tmp/project.json > /tmp/patch_body.json

curl -s -X PATCH "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}" \
  -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  --data @/tmp/patch_body.json
```

> ⚠️ 若你的 `jq` 不可用，也可在 Dashboard 手动操作：先添加 `JWT_SECRET_OLD`（值=当前密钥），
> 再修改 `JWT_SECRET` 为新值——**两个动作都做完再下一步部署**，中间不要单独触发构建。

### Step C — 触发部署
```bash
cd C:/cloudgame-hub-build
git add -A && git commit -m "chore: rotate JWT_SECRET (dual-key transition)" && git push
```
（CI/CD 会在 `main` 推送后自动构建部署。也可 `wrangler pages deploy dist --project-name=cloudgame-hub`。）

---

## 4. 验证（部署后）

```bash
# 1) 健康检查
curl -s https://www.hkdy123.top/api/health

# 2) 用【旧密钥】签发的令牌仍能通过 /api/me（证明双密钥生效）
#    —— 取一个轮换前登录留下的 Cookie 直接请求即可，应返回 200 + 用户信息

# 3) 新登录拿到的令牌用【新密钥】签名，也应正常
curl -s -X POST https://www.hkdy123.top/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<管理员邮箱>","password":"<密码>"}' -i
# 观察 Set-Cookie 中的 __Host-auth_token，再带它请求 /api/me 应 200
```

---

## 5. 过渡期结束 —— 清理 OLD

`JWT_SECRET` 的令牌有效期为 **7 天**（`JWT_EXPIRY_SECONDS`）。
确认所有旧密钥签发的令牌均已自然过期后（建议等 ≥ 8 天），删除 `JWT_SECRET_OLD`：

```bash
# 同样用合并方式回写，仅去掉 JWT_SECRET_OLD
jq '.deployment_configs.production.env_vars | del(.JWT_SECRET_OLD)' \
  /tmp/project.json > /tmp/new_envvars.json
# 然后走第 3 节 Step B 的 PATCH 流程（不带 JWT_SECRET_OLD）
# 最后 git push 触发部署
```

---

## 6. 回滚

若新密钥引发异常，把 `JWT_SECRET` 改回旧值即可（此时 `JWT_SECRET_OLD` 仍=旧值，
两个键都指向旧密钥，所有令牌恢复有效）。无需等过渡期。

---

## 7. 注意事项

- `JWT_SECRET_OLD` 为空时，验证等价于单密钥——**先上线双密钥代码不会破坏现有登录**。
- 切勿在 `JWT_SECRET_OLD` 仍生效期间**再次轮换**而不更新它：应把"当前主密钥"移入 OLD、
  主密钥换更新的，形成最多两把钥匙的滚动窗口。
- 密钥属敏感信息，勿提交进 git；仅通过 CF API / Dashboard 管理。
