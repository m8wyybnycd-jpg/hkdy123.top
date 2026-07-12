/**
 * SPA 壳路由：将所有 /app 及 /app/* 请求 rewrite 到内部静态产物 spa-shell，
 * 由前端 React Router (basename="/app") 接管客户端路由。
 *
 * 设计要点（避免 Cloudflare Pages 的 308 死循环）：
 * - 内部产物命名为 spa-shell（无 .html 扩展名），因此 Cloudflare 的
 *   clean-URL 功能对它完全不生效（clean-URL 只针对 .html 文件）。
 * - /app 路径下没有任何静态 .html 文件，不会触发边缘补斜杠/clean-URL
 *   重定向，请求会直接交给本 Function。
 * - 通过 env.ASSETS.fetch 在边缘内部直接取 spa-shell（不经过任何外部重定向），
 *   返回 SPA 壳 HTML。content-type 由本函数显式设置为 text/html。
 */
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  url.pathname = "/spa-shell";
  const assets = (context.env as any).ASSETS;
  const res = await assets.fetch(new Request(url.toString(), context.request));
  const headers = new Headers(res.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=300");
  return new Response(res.body, { status: res.status, headers });
};
