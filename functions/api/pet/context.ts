/**
 * GET /api/pet/context
 * 
 * Returns the page context label for the current route.
 * Used by the frontend to show "current page" tag in the pet widget.
 */
export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const { DB } = context.env;

  // Get route path from query string
  const url = new URL(context.request.url);
  const routePath = url.searchParams.get('path') || '/';

  // Try exact match first, then fallback to '/'
  let pageCtx = await DB.prepare(
    "SELECT route_path, page_label, page_icon, system_prompt, tips FROM pet_page_contexts WHERE route_path = ?"
  ).bind(routePath).first();

  if (!pageCtx) {
    pageCtx = await DB.prepare(
      "SELECT route_path, page_label, page_icon, system_prompt, tips FROM pet_page_contexts WHERE route_path = '/'"
    ).bind().first();
  }

  return new Response(JSON.stringify({
    code: 0,
    message: "success",
    data: pageCtx || { routePath: '/', pageLabel: '首页', pageIcon: '🏠', systemPrompt: '', tips: '' },
  }), {
    headers: { "Content-Type": "application/json" },
  });
};
