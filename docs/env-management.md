# 环境变量管理

## Cloudflare Pages Secrets

以下密钥通过 `wrangler pages secret put` 配置，不存储在代码仓库中：

| Secret 名称 | 用途 | 配置命令 |
|-------------|------|----------|
| `JWT_SECRET` | JWT 签名密钥 | `wrangler pages secret put JWT_SECRET` |
| `BREVO_API_KEY` | Brevo 邮件 API Key | `wrangler pages secret put BREVO_API_KEY` |
| `SMSBAO_USERNAME` | smsbao 短信用户名 | `wrangler pages secret put SMSBAO_USERNAME` |
| `SMSBAO_API_KEY` | smsbao 短信 API Key | `wrangler pages secret put SMSBAO_API_KEY` |

## 环境绑定

以下绑定在 `wrangler.toml` 中配置：

| 绑定名 | 类型 | 用途 |
|--------|------|------|
| `DB` | D1 Database | 主数据库 |
| `TOKEN_BLACKLIST` | KV Namespace | JWT 撤销黑名单 |
| `BACKUP_BUCKET` | R2 Bucket | D1 备份存储 (可选) |

## GitHub Secrets (CI/CD)

| Secret 名称 | 用途 |
|-------------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token (需 Pages:Edit 权限) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

## 本地开发

复制 `.env.example`（如果存在）或手动设置环境变量：

```bash
# .dev.vars 文件 (本地开发用，不提交到 git)
JWT_SECRET=your-local-jwt-secret
BREVO_API_KEY=your-brevo-api-key
SMSBAO_USERNAME=your-smsbao-username
SMSBAO_API_KEY=your-smsbao-api-key
```

## 安全注意事项

- **永远不要**在代码中硬编码密钥
- **永远不要**将 `.dev.vars` 或 `.env` 文件提交到 Git
- 定期轮换 API Key 和密钥
- 使用最小权限原则配置 Cloudflare API Token
