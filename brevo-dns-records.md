# Brevo 邮件域名验证 - DNS 记录（阿里云版）

域名注册商/ DNS 托管：**阿里云**
域名：`hkdy123.top`
发件人：`noreply@hkdy123.top`

## 操作入口

登录阿里云控制台：
- **https://dns.console.aliyun.com/**
- 或从阿里云首页 → 控制台 → 产品与服务 → 云解析 DNS → 域名解析

## 步骤

1. 进入 **云解析 DNS** → 找到域名 `hkdy123.top` → 点击「解析设置」
2. 点击「添加记录」
3. 按下面表格添加 5 条记录：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---------|---------|--------|-----|
| CNAME | `brevo1._domainkey` | `b1.hkdy123-top.dkim.brevo.com` | 默认（10 分钟） |
| CNAME | `brevo2._domainkey` | `b2.hkdy123-top.dkim.brevo.com` | 默认（10 分钟） |
| TXT | `@`（根域名） | `brevo-code:4c4a6751c206691099f25f9e803b2574` | 默认 |
| TXT | `@`（根域名） | `v=spf1 include:spf.brevo.com ~all` | 默认 |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` | 默认 |

4. 全部添加完成后，在 Brevo 后台点击「验证域名」（如果 Brevo 页面打不开，也可以回我一句「加好了」，我通过 API 调用 Brevo 验证）

## 注意事项

- 添加这些记录**不会影响**网站现有访问（你的 `www` 解析到 Cloudflare Pages 那条保持不变）
- 2 条 CNAME 记录的主机记录是 `brevo1._domainkey` 和 `brevo2._domainkey`，不是 `@`
- 3 条 TXT 记录中，2 条的主机记录是 `@`（根域名），1 条是 `_dmarc`
- 阿里云的主机记录填 `@` 表示根域名 `hkdy123.top`
