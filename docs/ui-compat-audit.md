# cloudgame-hub UI / 设计兼容性审查报告

> 审查对象：`C:/cloudgame-hub-build`
> 审查角色：MVP 专家团 · 设计总监（UI/设计兼容性审查）
> 审查日期：2026-07-12
> 新设计权威来源：根路径暗色高端科技感落地页（Ardot 设计稿实现，单文件 `index.html` + `public/landing.js`）
> 结论先行：**严重不兼容** —— 全站仅根落地页匹配新设计；`/app` React SPA 与 `/admin` 后台 100% 停留于旧暗色设计体系，且 admin 后台是第三套相互冲突的浅色主题。

---

## 0. 整体兼容性结论

| 区块 | 是否匹配新设计 | 结论 |
|------|----------------|------|
| 根落地页 `index.html` | ✅ 匹配 | 新设计（极光暗色）唯一合规实现 |
| `public/landing.js` | ✅ 基本一致 | 与落地页同源，参数一致（仅文案 emoji 待清） |
| `app/index.html`（SPA 壳） | ❌ 不匹配 | 未引入 Google Fonts、未设主题色 |
| React SPA 全部页面/组件（`src/`） | ❌ 不匹配 | 全量旧 token（`game-dark` / `neon-*` / `slate-*`） |
| `/admin` 管理后台 | ❌ 不匹配 | **第三套浅色主题**，与新旧暗色都不统一 |
| 构建部署配置（`_headers` / `_redirects`） | ⚠️ 冲突 | 根目录与 `public/` 两份不一致，存在字体 CSP 隐患 |

**核心矛盾**：新版品牌视觉（极光暗色 `#030014` / `#2EA7FF` / `#9381FF` / `#13DDC4`、玻璃白低透卡、pill 渐变按钮、Inter + Noto Sans SC）**只落地在静态落地页**；而真正的产品交互层（登录、云游戏、云电脑、薅羊毛、后台）全部仍是旧色板与 system 字体、圆角非 pill、玻璃质感实现方式不同。访问者从落地页点进 `/app` 会经历明显的视觉割裂。

---

## 1. 权威新设计参数 vs 当前 SPA 旧参数对照

| 维度 | 新设计（权威） | 旧设计（SPA 现状） | 差异等级 |
|------|----------------|------------------|----------|
| 画布底 | `#030014` 近黑深蓝紫 | `game-dark:#0e131c`（更偏蓝灰） | 🔴 大 |
| 极光主色 | 青蓝 `#2EA7FF` / 紫蓝 `#9381FF` / 青绿 `#13DDC4` | `neon-blue:#3b9eff` / `neon-purple:#a78bfa` / `neon-green:#34d399` | 🔴 大 |
| 玻璃卡填充 | 白 SOLID 0.03–0.05（`rgba(255,255,255,.04)`） | `bg-game-card:#171e2b`（实色深卡） | 🔴 大 |
| 玻璃卡描边 | 白 SOLID 0.08–0.12（`rgba(255,255,255,.10)`） | `border-game-border:#283044`（实色边框） | 🔴 大 |
| 玻璃卡圆角 | 16–20px（`--radius:20px`） | `rounded-2xl`(16px)/`rounded-3xl`(24px) 混用 | 🟡 中 |
| 玻璃卡阴影 | 双阴影（无模糊）`0 10px 30px rgba(0,0,0,.5), inset 0 1px 2px rgba(255,255,255,.18)` | `backdrop-blur-xl` + 模糊投影 | 🟡 中 |
| 按钮 | pill 形 `border-radius:99px` + 青→紫渐变 + 投影 | `rounded-lg`/`rounded-xl`（非 pill）+ `from-neon-blue to-neon-purple` | 🔴 大 |
| 字体 | 英文/大数字 Inter Bold（渐变填充）+ 中文 Noto Sans SC | `system-ui` 系统字体（Tailwind `fontFamily.sans`） | 🔴 大 |
| 环境光晕 | 多色 aurora（`blur(90px)`，青/紫/青绿混搭） | 单色 `blur-3xl` 仅蓝/紫，强度 `bg-neon-*/10` | 🟡 中 |

---

## 2. 逐文件 / 逐组件审查清单

> 字段说明：每条 = **位置** · **当前实现** · **与新设计差异** · **不匹配原因** · **修复建议**

### A. 已合规区块（仅需清 emoji）

**A1 · 落地页 `index.html`（根）**
- 位置：`index.html` 全文，尤其 `:root` (L12-30)、`.glass` (L83-88)、`.btn` (L69-80)、`.aurora` (L46-49)
- 当前实现：`--bg:#030014`；`--cyan:#2EA7FF / --purple:#9381FF / --teal:#13DDC4`；玻璃卡 `rgba(255,255,255,.04)` + `rgba(255,255,255,.10)` + `radius:20px` + 双阴影；按钮 `border-radius:99px` 渐变；字体 Inter + Noto Sans SC（L10）；响应式 1024/760（L264, L270）
- 差异：基本匹配；**两处小偏差**：① L87 玻璃卡外投影带 `blur 30px`，权威要求"投影（无模糊）"，可去掉外投影模糊或改用纯硬投影；② L600 toast 文案含 emoji 🎮
- 不匹配原因：玻璃投影略有模糊、文案用了 emoji
- 修复建议：① `.glass` 改 `box-shadow:0 10px 30px rgba(0,0,0,.5), inset 0 1px 2px rgba(255,255,255,.18)`（去 blur）；② L600 `<div class="toast" ...>更多游戏即将上线，敬请期待 🎮</div>` 删除 🎮

**A2 · `public/landing.js`**
- 位置：L25（`showToast('更多游戏即将上线，敬请期待 🎮')`）、L31（`'注册成功！欢迎加入云玩汇 🎉'`）
- 当前实现：与落地页同源，类名/参数一致
- 差异：仅文案 emoji（🎮 / 🎉）
- 不匹配原因：违反"禁止 emoji 作为功能图标/文案装饰"
- 修复建议：改为纯中文文案，如 `'更多游戏即将上线，敬请期待'`、`'注册成功！欢迎加入云玩汇'`

---

### B. 全局基础设施（最严重，影响全站 SPA）

**B1 · `tailwind.config.js`（设计 Token 源头）**
- 位置：L8-18（colors）、L20-30（fontFamily）、L31-36（boxShadow）
- 当前实现：`game-dark:#0e131c`、`game-card:#171e2b`、`game-border:#283044`、`neon-blue:#3b9eff`、`neon-purple:#a78bfa`、`neon-green:#34d399`；`fontFamily.sans = system-ui`；`boxShadow.glow` 用 `neon-blue`
- 差异：整套旧色板 + 系统字体，与权威新极光色板 / Inter+Noto 完全不符
- 不匹配原因：SPA 全部组件/页面均 `@apply` 或 `bg-neon-blue` 引用此处旧 token；这是全站不兼容的根因
- 修复建议：在 `theme.extend.colors` 新增新极光 token（如 `bg:#030014`、`surface:#07021c`、`aurora-cyan:#2EA7FF`、`aurora-purple:#9381FF`、`aurora-teal:#13DDC4`、`glass:rgba(255,255,255,.04)`、`glass-stroke:rgba(255,255,255,.10)`），并保留旧名做向后兼容或一次性迁移；`fontFamily.sans` 改为 `['Inter','Inter Tight','Noto Sans SC',system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif]`

**B2 · `src/index.css`（全局基底样式）**
- 位置：L5-14（body）、L10-12（radial 渐变光晕）、L17-33（scrollbar 用 `#283044`/`#3a4560`）、L44-46（`.glass-card` 旧实现）、L49-56（`.gradient-text` 旧 `from-neon-blue to-neon-purple`）、L59-73（`.skeleton` `bg-game-elevated`）
- 当前实现：`body{@apply bg-game-dark text-slate-200}`；光晕用 `neon-blue/neon-purple` 低透；`.glass-card{border-game-border bg-game-card/70 backdrop-blur-xl}`；`.gradient-text{from-neon-blue to-neon-purple}`
- 差异：底色旧、玻璃卡为模糊实色卡非白低透、渐变文字旧色、滚动条用旧色值
- 不匹配原因：全局基底决定了所有页面外观
- 修复建议：body 改 `bg-[#030014] text-white/90`；新增 `.glass-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,.5), inset 0 1px 2px rgba(255,255,255,.18)}`；`.gradient-text` 改 `linear-gradient(135deg,#2EA7FF,#13DDC4)`；scrollbar 改 `rgba(255,255,255,.08)` 系

**B3 · `app/index.html`（SPA 壳 head/meta/标题）**
- 位置：L1-69（尤其 L9 标题、L33 favicon、无任何字体 `<link>`）
- 当前实现：`<title>云玩汇 · 云游戏 / 云电脑一键直达</title>`；有 OG/Twitter/JSON-LD；**未引入 Google Fonts**（无 `preconnect`、无 `fonts.googleapis.com` 样式表）；未设 `theme-color`；favicon 用 `/favicon.svg`
- 差异：SPA 内部页面渲染时完全没有 Inter/Noto Sans SC 来源，回退 system-ui
- 不匹配原因：SPA 以 `main.tsx` 引入 `index.css`（仅 Tailwind 旧 `fontFamily`，无字体加载）；壳未挂字体链接
- 修复建议：在 `<head>` 增加与落地页一致的 Google Fonts 链接（Inter + Inter Tight + Noto Sans SC，L8-10 同款），并加 `<meta name="theme-color" content="#030014">`，保证 SPA 首屏即新字体

---

### C. 共享组件（全部旧设计）

**C1 · `Header.tsx`**
- 位置：L52（`bg-game-darker/80 backdrop-blur-xl`）、L56/L85/L148/L265（`from-neon-blue to-neon-purple`）、L77/L130（`text-slate-*`）、L148（`rounded-xl` 登录按钮——**非 pill**）、L159（`bg-game-card/60`）
- 当前/差异/原因：沿用旧 token；登录/注册按钮 `rounded-xl` 非权威 pill（99px）；渐变旧色
- 修复建议：按钮改 `rounded-full` + 新渐变（`from-[#2EA7FF] to-[#13DDC4]` 或 `from-[#2EA7FF] to-[#9381FF]`）；header 底改 `bg-[#030014]/70 backdrop-blur-xl border-white/[.06]`；文字 `text-white/70` hover `text-white`

**C2 · `Footer.tsx`**
- 位置：L13（`bg-game-darker/60`）、L42/L44（`from-neon-blue to-neon-purple` 渐变分隔线）
- 差异：旧底 + 旧渐变线
- 修复建议：底改 `bg-[#030014]/60 border-white/[.06]`；分隔线改 `from-[#2EA7FF] to-[#13DDC4]`

**C3 · `GameCard.tsx`**
- 位置：L13-26（`typeGradients` 用 Tailwind 默认色 `from-violet-600/…` 等——**非极光板**）、L60（`bg-game-card … shadow-card`）、L83（`{game.emoji}`——**emoji 作封面图标**）、L100（`group-hover:text-neon-blue`）、L109（`bg-game-elevated` 标签）
- 差异：封面用 emoji 而非 Lucide 图标/真图；类型渐变用默认紫/青/橙而非权威极光色；卡片为实色深卡非玻璃
- 修复建议：emoji 封面改 Lucide 占位图标（如 `Gamepad2`）或平台色块；`typeGradients` 收敛为 `#2EA7FF/#9381FF/#13DDC4` 三极光色系；卡片套新 `.glass-card`

**C4 · `DesktopCard.tsx`**
- 位置：L17（`bg-game-card … shadow-card`）、L19/L23/L84（neon 渐变/图标色）、L70（`<span>🎁</span>`——**emoji 作活动图标**）
- 差异：emoji 🎁；旧渐变
- 修复建议：🎁 改为 Lucide `Gift`；渐变改极光色

**C5 · `DealCard.tsx`**
- 位置：L42（`bg-game-card … shadow-card`）、L48（`bg-neon-purple/15`）、L109（`hover:bg-neon-blue/10`）
- 差异：实色深卡 + neon 旧色
- 修复建议：套 `.glass-card`；强调色改 `#9381FF`/`#2EA7FF`

**C6 · `PlatformCard.tsx`**
- 位置：L18（`bg-game-card`）、L37（`group-hover:text-neon-blue`）、L85（`<span>🎁</span>`——emoji）
- 差异：emoji 🎁；旧色
- 修复建议：🎁→Lucide `Gift`；配色改极光

**C7 · `SearchBar.tsx`**
- 位置：L41（`border-game-border bg-game-card … focus:ring-neon-blue/20`）、L56（`from-neon-blue to-neon-purple` 搜索按钮——`rounded-lg` 非 pill）
- 差异：旧色 + 非 pill 按钮
- 修复建议：输入框套玻璃风；搜索按钮改 `rounded-full` 新渐变

**C8 · `FilterBar.tsx`**
- 位置：L34（`rounded-2xl border-game-border bg-game-card/60`）、L48/L104（激活态 `from-neon-blue to-neon-purple`）
- 差异：旧色板
- 修复建议：激活 pill 改极光渐变；容器改玻璃

**C9 · `AnnouncementBar.tsx`**
- 位置：L58/L67/L81（`bg-neon-blue/*` `text-neon-blue`）
- 差异：旧蓝
- 修复建议：改 `#2EA7FF` 系

**C10 · `AnnouncementModal.tsx`**
- 位置：L183（`bg-game-card shadow-2xl`）、L230（`from-neon-blue to-neon-purple` 确认按钮）
- 差异：旧卡 + 旧渐变按钮
- 修复建议：弹窗套玻璃；按钮 `rounded-full` 极光渐变

**C11 · `BannerCarousel.tsx`**
- 位置：L62（`color:#fff`）、L89（`background:#3b9eff`——**硬编码旧蓝** 用于 Swiper 分页器激活点）
- 差异：硬编码 `#3b9eff`（旧 neon-blue），与权威 `#2EA7FF` 不符
- 不匹配原因：`<style>` 内联硬编码，绕过了 Tailwind token
- 修复建议：L62 `#fff`→`rgba(255,255,255,.9)`；L89 `#3b9eff`→`#2EA7FF`

**C12 · `MessageBell.tsx`**
- 位置：L168（`bg-game-card/60 … hover:bg-neon-blue/10`）、L186/L227/L287（neon 文字/hover）
- 差异：旧色
- 修复建议：统一极光色

**C13 · `GameModal.tsx`**
- 位置：L73（`bg-game-card`）、L108（`from-neon-blue/20 to-neon-purple/20` + `{game.emoji}` L109——**emoji**）、L156/L197（neon 强调）
- 差异：emoji 封面 + 旧色
- 修复建议：emoji→Lucide；玻璃卡 + 极光

**C14 · `PlatformModal.tsx`**
- 位置：L50（`bg-game-card`）、L91/L117/L129（neon 强调）、L143（按钮用 `platform.color` 内联）
- 差异：旧卡；强调旧蓝/紫
- 修复建议：玻璃卡；强调改极光

**C15 · `BannerSkeleton.tsx`**
- 位置：L10（`bg-slate-800`——注意：用的是 `slate-800` 而非 `game-elevated`，**与同项目其他骨架屏不一致**）
- 差异：骨架屏底色用了 `slate-800`（更亮），与其他组件 `game-elevated` 不统一
- 修复建议：统一为玻璃卡底或 `bg-white/[.04]`

**C16 · `DealFilter.tsx`**
- 位置：L21（`rounded-2xl border-game-border bg-game-card/60`）、L34（激活 `from-neon-blue to-neon-purple`）
- 差异：旧色
- 修复建议：极光渐变 + 玻璃

**C17 · `ErrorBoundary.tsx`**
- 位置：L62（错误页按钮 `bg-neon-blue … hover:bg-blue-600`）
- 差异：旧蓝按钮
- 修复建议：改极光 `from-[#2EA7FF] to-[#13DDC4]`

**C18 · `PageDisabledNotice.tsx`**
- 位置：L19（`bg-game-card/80`）、L33（返回按钮 `from-neon-blue to-neon-purple`）
- 差异：旧色
- 修复建议：玻璃 + 极光

**C19 · `PlatformBar.tsx`**
- 位置：L29（`bg-game-card`）、L19/L48/L77（neon）
- 差异：旧色
- 修复建议：极光

**C20 · `RelatedLinks.tsx`**
- 位置：L23/L29/L35/L41/L47/L53（各链接图标 `text-neon-blue/purple/green/amber/cyan/rose`）、L84（`bg-game-card/60`）
- 差异：图标色五颜六色 + 旧卡
- 修复建议：收敛到极光三色；卡片玻璃化

**C21 · `StateView.tsx`**
- 位置：L40（`bg-slate-700/50`——又是 `slate-700` 而非 `game-elevated`，**骨架屏不一致**）、L64（重试按钮 `from-neon-blue to-neon-purple`）
- 差异：骨架屏 `slate-700` 与全站 `game-elevated` 不一致；按钮旧渐变
- 修复建议：统一骨架底色；按钮极光 pill

**C22 · `TipsSection.tsx`**
- 位置：L49/L65（amber `bg-amber-500/15` `text-amber-400`）、L62（`bg-game-card/60`）
- 差异：amber 暖色点缀 + 旧卡
- 修复建议：暖色点缀可保留但卡片玻璃化；或统一极光

**C23 · `SEO.tsx`**：仅输出 meta/JSON-LD，**无视觉 token，无需改**。

---

### D. 公共页面（全部旧设计）

**D1 · `HomePage.tsx`**
- 位置：L26（`mx-auto max-w-6xl`——容器 1152px，权威落地页 `max-w:1200px`）、L28/L254（`bg-gradient-to-br from-game-card to-game-darker` hero）、L29-30（仅蓝/紫光晕）、L44/L263（CTA `from-neon-blue to-neon-purple` + **`rounded-xl` 非 pill**）、L70 起各特性卡 `bg-game-card` + `hover:border-neon-blue/30`
- 差异：容器偏窄、底色旧、`rounded-xl` 非 pill、光晕仅双色
- 修复建议：容器改 `max-w-[1200px]`；hero/卡片套玻璃；CTA 改 `rounded-full` 极光渐变；光晕加 `#13DDC4`

**D2 · `CloudGamesPage.tsx`**
- 位置：L66（`max-w-6xl`）、L68（`from-game-card to-game-darker` hero）、L70-71（蓝/紫光晕）、L73（图标 `from-neon-blue/20 to-neon-purple/20`）
- 差异：旧底 + 旧渐变 + 非 pill 入口（`PlatformCard` 内部按钮）
- 修复建议：同 D1

**D3 · `CloudDesktopsPage.tsx`**
- 位置：L64（`max-w-6xl`）、L66（hero 旧渐变）、L67-68（蓝/紫光晕）
- 差异：旧色
- 修复建议：极光 + 玻璃

**D4 · `DealsPage.tsx`**
- 位置：L81（`max-w-6xl`）、L83（hero 旧渐变）、L84（绿光晕 `neon-green/10`）
- 差异：hero 用 `neon-green` 旧绿，非权威 `#13DDC4`
- 修复建议：`neon-green/10`→`#13DDC4/10`；容器/卡片玻璃化

**D5 · `FreeGamesPage.tsx`**
- 位置：L41（`max-w-6xl`）、L154（免责声明含 `⚠️` emoji——**emoji 作警示图标**）、L179（`{game.emoji}` 封面）、L168（`from-slate-600/90…` 兜底渐变）、L186/L209（neon-green 按钮）
- 差异：emoji ⚠️ + 封面 emoji；兜底渐变用默认 slate；按钮非 pill
- 修复建议：⚠️→Lucide `AlertTriangle`；封面 emoji→图标；按钮 `rounded-full` 极光

**D6 · `LibraryPage.tsx`**
- 位置：L79（`max-w-6xl`）、L81（hero 旧渐变）、L82（紫光晕）、L123（`bg-game-card` 空态）
- 差异：旧色
- 修复建议：极光 + 玻璃

**D7 · `MessagesPage.tsx`**
- 位置：L114/L130/L144（`max-w-2xl`）、L119/L150（标题图标 `text-neon-blue`）、L155（筛选 tab `bg-game-card/60`）、L165（激活 `from-neon-blue to-neon-purple`）、L192（`border-game-border bg-game-card`）
- 差异：旧色 + 激活 tab 旧渐变
- 修复建议：极光 + 玻璃；筛选激活 pill 极光

**D8 · `ProfilePage.tsx`**
- 位置：L51（`max-w-md`）、L55（`bg-game-card`）、L58（头像 `from-neon-blue to-neon-purple`）、L129/L137（按钮 `from-neon-blue to-neon-purple` / `border-game-border`——**非 pill**）
- 差异：旧渐变 + 非 pill 按钮
- 修复建议：按钮 `rounded-full` 极光

**D9 · `SearchPage.tsx`**
- 位置：L102（`max-w-6xl`）、L127（`text-neon-blue` 计数）、L142/L176/L209（各段图标 `neon-*`）、L163/L196/L225（加载更多 `border-game-border` 非 pill）、L249（hot tag hover `neon-blue`）
- 差异：旧色；"加载更多"按钮非 pill
- 修复建议：极光；按钮玻璃/pill

**D10 · `SmsPlatformsPage.tsx`**
- 位置：L87（`max-w-6xl`）、L91（hero `from-neon-purple/10 via-game-card to-neon-blue/10`）、L121（`categoryGradients` 渐变文字）、L138（工具栏 `bg-game-card/60`）、L169（激活 `from-neon-blue to-neon-purple`）、L374（CTA `from-neon-blue/20 to-neon-purple/20`——**非 pill**）
- 差异：旧色 + 非 pill CTA
- 修复建议：极光；CTA `rounded-full`

**D11 · `AnnouncementsListPage.tsx`**
- 位置：L125（`max-w-2xl`）、L140（类型 tab 激活 `from-neon-blue to-neon-purple`）、L162（`bg-game-card` 卡片）
- 差异：旧色
- 修复建议：极光 + 玻璃

**D12 · `NotFoundPage.tsx`**
- 位置：L14（`bg-game-dark`）、L19（404 `from-neon-blue to-neon-purple` 渐变文字）、L34/L40（按钮 `from-neon-blue to-neon-purple` / `border-game-border`——非 pill）
- 差异：旧底 + 旧渐变 + 非 pill
- 修复建议：`bg-[#030014]`；按钮 `rounded-full` 极光

---

### E. 认证 / 登录页

**E1 · `AuthPage.tsx`**（用户登录/注册/SMS）
- 位置：L360（`bg-game-dark`）、L365-367（仅蓝/紫/蓝 三处光晕，无青绿 `#13DDC4`）、L371（logo `from-neon-blue to-neon-purple`）、L388/L399/L410/L422（tab 激活 `from-neon-blue to-neon-purple`——**`rounded-lg` 非 pill**）、L632（提交按钮 `from-neon-blue to-neon-purple` + **`rounded-lg` 非 pill**）
- 当前/差异：已有环境光晕（方向对），但**全部旧色板、按钮非 pill、字体 system**
- 不匹配原因：沿用旧 token；按钮圆角未达 pill
- 修复建议：光晕加 `#13DDC4`；所有主按钮/提交改 `rounded-full` + 极光渐变（`#2EA7FF→#13DDC4` 或 `#2EA7FF→#9381FF`）；底 `bg-[#030014]`

**E2 · `AdminLoginPage.tsx`**（管理员登录）
- 位置：L95（`bg-game-dark`）、L97-99（**amber/orange 暖色光晕**——刻意与用户端区分）、L103（logo `from-amber-500 to-orange-600`）、L174（提交 `from-amber-500 to-orange-600` + `rounded-lg` 非 pill）
- 差异：**独立 amber 暖色主题**，与权威极光暗色冲突；按钮非 pill
- 修复建议：管理员端可保留一抹差异化强调色，但统一到暗底 `#030014` + 玻璃卡 + pill 按钮；强调色建议收为 `#9381FF`（紫蓝）而非橙，以贴合极光体系

---

### F. 管理后台段（第三套 · 浅色主题，最割裂）

> 后台与新旧两套暗色设计**都不统一**：它是浅色（白底 + slate 字 + Tailwind 默认蓝/紫/橙/粉/青）的"后台模板"风格。

**F1 · `admin/AdminLayout.tsx`**
- 位置：L17（`min-h-screen bg-[#f5f6fa]`——**浅灰亮底**）
- 差异：全站唯一的浅色大背景，与落地页/公共页暗色彻底割裂
- 不匹配原因：后台独立设计语言
- 修复建议：改为暗色 `bg-[#030014]` 或与公共端一致的玻璃外壳；sidebar/content 统一极光 token

**F2 · `admin/Sidebar.tsx`**
- 位置：L111（`bg-[#1a1d2e]`——深色侧栏，但与公共端 `#030014` 不同）、L70/L119（`text-[#3b9eff]` / `bg-[#3b9eff]/15`——**硬编码旧 neon-blue `#3b9eff`**）、L72（`text-slate-400`）
- 差异：侧栏深色但用硬编码旧蓝 `#3b9eff`（非权威 `#2EA7FF`）；与浅色 content 区形成"深色栏+浅色内容"拼接，整体不统一
- 修复建议：`#3b9eff`→`#2EA7FF`；侧栏底改 `#07021c` 与画布统一

**F3 · `admin/TopBar.tsx`**
- 位置：L38（`bg-white border-slate-200`）、L48（`text-slate-800`）、L56/L71（`text-slate-500/600 hover:bg-slate-100`）
- 差异：**纯白顶栏 + 灰字**，典型浅色后台
- 修复建议：改暗色顶栏 `bg-[#07021c]/80 backdrop-blur border-white/[.06]` + 白字

**F4 · `admin/DashboardPage.tsx`**
- 位置：L57/L69（spinner/hover 用硬编码 `#3b9eff`/`#2b8ae6`）、L80-85（`bg-blue-50 text-blue-500` 等 **Tailwind 默认调色板**）、L95/L113/L119（`bg-white border-slate-200 shadow-sm` 白卡）、L103/L114（`text-slate-800`）、L177-180（图表柱 `#8b5cf6`/`#f97316`/`#ec4899`/`#06b6d4`——**默认 palette 硬编码**）
- 差异：白卡 + 默认蓝/紫/橙/粉/青 + 硬编码旧蓝；与极光暗色毫无关联
- 修复建议：卡片改玻璃 + 暗底；强调色收敛到 `#2EA7FF/#9381FF/#13DDC4`；图表柱色替换为极光三色

**F5 · `admin/SettingsPage.tsx`**
- 位置：L140/L160（`border-slate-200 bg-white` 输入框，浅色）、L244（保存按钮 `bg-neon-blue`——旧蓝）、L178（toggle `bg-neon-blue`）、L260/L274（关闭按钮用 **emoji `✕`** 作图标）、L240（`text-slate-800`）
- 差异：浅色表单 + 旧蓝 + **emoji ✕** + 暗灰字
- 修复建议：表单暗色玻璃化；emoji ✕→Lucide `X`；强调改极光

**F6 · 其他 admin 页面（`UsersPage` / `content/PlatformsPage` / `content/DesktopsPage` / `content/DealsPage` / `content/GamesPage` / `RolesPage` / `LogsPage` / `BannersPage` / `MessagesPage` / `PageConfigsPage` / `ForbiddenPage`）**
- 位置：参考 `PageConfigsPage.tsx`(12 处旧 token)、`content/GamesPage.tsx`(L26/L340 emoji 占位 `🎮`)、`SettingsPage`(6 处)
- 差异：均继承 `AdminLayout` 浅色外壳 + slate/Tailwind 默认色；`content/GamesPage` 编辑表单含 emoji 占位
- 修复建议：随 F1–F5 统一迁移到暗色极光体系；清除 emoji 占位

---

### G. 数据 / 内容层 emoji（渲染为图标）

**G1 · `src/data/games.ts`**：L255/L426/L439/L532/L1151/L1216/L1432/L1447 等 `emoji:"⚡"/"🔥"/"🎮"/"🎲"` 等——在 `GameCard`/`GameModal` 中作封面图标渲染
**G2 · `src/data/freeGames.ts`**：L36(`🔥`)/L41(`⚡`)/L44(`⚡`)/L47(`🎲`) 等同理，在 `FreeGamesPage` 封面渲染
**G3 · `src/data/smsPlatforms.ts`**：含 `neon-*` 间接引用（2 处），分类渐变用非极光色
- 差异：emoji 作为视觉图标，违反"禁止 emoji 作功能图标"
- 修复建议：游戏/资源封面优先用真图（`cover` 字段已支持），无图时回退 Lucide 图标（按类型映射，如 `Gamepad2`/`Monitor`/`Gift`），彻底移除 emoji 数据源

---

### H. 死代码（未引用，旧设计副本）

**H1 · `src/pages/bab81023-e4c3-4c75-b090-31550079d116.tsx`**
- 位置：全文（与 `AuthPage.tsx` 几乎一致，仅少了"邮箱验证码"tab）
- 当前实现：`AuthPage` 的**重复副本**，使用全套旧 token（`bg-game-dark` L323、`from-neon-blue to-neon-purple` L331/L350…、`rounded-lg` 非 pill）
- 差异：随机哈希文件名、未被 `App.tsx` 任何路由引用（死代码）、旧设计
- 不匹配原因：疑似迁移残留/构建产物误入源码
- 修复建议：**直接删除该文件**（确认 `App.tsx` 无 import 后），避免维护歧义与体积浪费

---

### I. 构建 / 部署配置（CSP 与字体隐患）

**I1 · `_headers`（根目录）vs `public/_headers`（public/）—— 两份不一致**
- 位置：根 `_headers` L8（`style-src … https://fonts.googleapis.com`；`font-src … https://fonts.gstatic.com`——**允许 Google Fonts**）；`public/_headers` L8（`font-src 'self' data:`；`style-src 'self' 'unsafe-inline'`——**禁止 Google Fonts**，且无 `upgrade-insecure-requests`）
- 差异：两份 CSP 冲突。当前 `dist/_headers`（构建产物）内容等同**根目录版**（允许字体），但 `public/_headers` 会在不同构建顺序下覆盖，导致落地页字体被 CSP 拦截
- 不匹配原因：新旧两份 `_headers` 未合并，字体策略不明确
- 修复建议：删掉其中一份或显式合并为单源；确保 `/*` 下 `style-src` 含 `https://fonts.googleapis.com`、`font-src` 含 `https://fonts.gstatic.com`，使落地页与（未来的）SPA 字体均可用；并保留 `upgrade-insecure-requests`

**I2 · `_redirects`（根）vs `public/_redirects`**
- 位置：根 `_redirects`（含旧路由 301→`/app/*` 映射）、`public/_redirects`（同样内容）
- 差异：两份重复，内容一致（无功能冲突，但维护双份易漂移）
- 修复建议：保留单源（建议 `public/_redirects`，因 Vite 会原样拷入 `dist/`），删除根目录副本

**I3 · `vite.config.ts`**
- 位置：L19-22（`build.rollupOptions.input` 含 `main:index.html` 与 `app:app/index.html` 双入口）
- 差异：双 HTML 入口本身合理，但 `app/index.html` 未挂字体 `<link>`，导致 SPA bundle 不加载 Inter/Noto
- 修复建议：在 `app/index.html` `<head>` 追加与落地页一致的 Google Fonts 链接（见 B3）

---

## 3. 三大重点专项

### 重点一：落地页 `index.html` 与 `public/landing.js` 是否同源同参？
**结论：基本同源同参，仅文案 emoji 待清。**
- 参数一致：两者均基于 `--bg:#030014`、极光三色、`radius:20px`、glass `rgba(255,255,255,.04)/.10`、pill 渐变按钮、Inter+Noto。
- `landing.js` 类名（`.glass`/`.btn`/`.reveal`/`.chip`/`.toast`）与 `index.html` 内联样式一一对应，无参数冲突。
- **唯一偏差**：`landing.js` L25/L31 与 `index.html` L600 的 toast 文案含 emoji（🎮/🎉），建议清除（A1/A2）。

### 重点二：`/app` SPA 外壳与内部页面视觉是否统一？
**结论：壳与内部"旧设计"内部统一，但整体与权威新设计不统一。**
- 外壳 `app/index.html` 未引入字体 → SPA 全站回退 `system-ui`，与内部 `index.css`（`fontFamily.sans=system-ui`）自洽，但**两者都没用 Inter/Noto**。
- 内部所有页面/组件统一走旧 `game-*`/`neon-*`/`slate-*` 体系（已在 C/D/E 逐条举证，共 30+ 文件命中旧 token），彼此一致。
- 因此"壳↔内页"在**旧设计层面**是统一的，但相对本次审查的**权威新设计**整体失败。修复须从 `tailwind.config.js` + `index.css` + `app/index.html` 三处基础设施入手（见 B 组），再自上而下替换组件/页面。

### 重点三：是否仍有页面/组件停留旧设计？
**结论：是，且占比接近 100%。** 除根落地页外，**所有** `/app` 页面与组件、`/admin` 后台均为旧设计；其中后台还是第三套浅色主题。仍停留旧设计的具体清单：
- 全局：B1 `tailwind.config.js`、B2 `index.css`、B3 `app/index.html`
- 共享组件（22 个）：C1–C23（Header/Footer/各 Card/Modal/Bar/StateView 等）
- 公共页（12 个）：D1–D12（Home/云游戏/云电脑/薅羊毛/免费游戏/库/消息/资料/搜索/接码/公告/404）
- 认证：E1 `AuthPage`、E2 `AdminLoginPage`
- 后台（13+ 个）：F1–F6（AdminLayout/Sidebar/TopBar/Dashboard/Settings 及 Users/内容管理/角色/日志/横幅/站内信/页面配置/Forbidden）
- 数据层：G1–G3（games/freeGames/smsPlatforms 的 emoji 与默认色）
- 死代码：H1 `bab81023-*.tsx`

---

## 4. 修复路线图（建议优先级）

| 优先级 | 任务 | 影响面 |
|--------|------|--------|
| P0 | B3：给 `app/index.html` 加 Google Fonts 链接 + `theme-color` | SPA 字体立即可用 |
| P0 | I1：合并 `_headers` 为单源，CSP 放行 `fonts.googleapis.com`/`fonts.gstatic.com` | 避免落地页/ SPA 字体被拦 |
| P0 | B1+B2：在 `tailwind.config.js` 新增极光 token；`index.css` 重写 `.glass-card`/`.gradient-text`/body 底 | 全站设计语言根因 |
| P1 | C/D/E 全组件页面：旧 `neon-*`/`game-*` 替换为新极光 token；卡片套玻璃；主按钮改 `rounded-full` 极光渐变 | 公共端视觉统一 |
| P1 | F1–F6：后台从浅色主题迁移到暗色极光；硬编码 `#3b9eff`/`#2b8ae6`→`#2EA7FF`；白卡→玻璃 | 消除第三套主题割裂 |
| P2 | 清除所有 emoji：G1–G3 数据层、C3/C4/C5/C13/D5 emoji 封面、F5 `✕`、A1/A2 文案 | 满足"禁止 emoji 作图标" |
| P2 | 响应式对齐：SPA 容器 `max-w-6xl`(1152)→`max-w-[1200px]`；补充 760px 档（当前用 md=768 近似） | 对齐权威 1440/1024/760 |
| P2 | H1：删除 `bab81023-*.tsx` 死代码 | 消除维护歧义 |

---

## 5. 不兼容项汇总（计数）

- 🔴 致命不兼容（色板/字体/主题根本不同）：约 **48 处**（B1/B2/B3、C1–C23、D1–D12、E1/E2、F1–F6、I1/I3）
- 🟡 中等不兼容（圆角非 pill、玻璃实现方式、响应式档位、骨架屏底色不一致）：约 **30+ 处**（各页面 `rounded-lg/xl` 按钮、glass 模糊 vs 白低透、容器宽度、BannerSkeleton/StateView 的 `slate-*`）
- ⚠️ 内容/图标违规（emoji）：**至少 8 处**（🎮×2、🎉×1、🎁×2、⚠️×1、✕×2，及数据层 games/freeGames 多个 emoji 字段）
- ✅ 已合规：仅 `index.html` 落地页（含 `landing.js`，仅 emoji 待清）

> 一句话总结：**新设计只"装修"了门面（落地页），客厅到卧室（SPA）和地下室（后台）还全是旧装潢，且地下室还是另一套风格。需从设计 token 根层做一次系统性迁移。**
