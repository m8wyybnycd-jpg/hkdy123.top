/**
 * GET /api/pet/memory
 * Returns user's pet memories (preferences, facts, events, summaries)
 * 
 * POST /api/pet/memory
 * Add a new memory manually (for future admin or user-driven memory)
 */

export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const { DB } = context.env;
  const user = context.data?.user;

  if (!user) {
    return new Response(JSON.stringify({ code: 401, message: "请先登录", data: null }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = user.userId as number;

  const pet = await DB.prepare("SELECT id FROM pets WHERE user_id = ?").bind(userId).first();
  if (!pet) {
    return new Response(JSON.stringify({ code: 0, message: "success", data: { memories: [] } }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const memories = await DB.prepare(
    "SELECT id, pet_id, memory_type, content, importance, created_at, updated_at FROM pet_memories WHERE pet_id = ? ORDER BY importance DESC, created_at DESC"
  ).bind(pet.id as number).all();

  return new Response(JSON.stringify({
    code: 0,
    message: "success",
    data: { memories: memories.results || [] },
  }), {
    headers: { "Content-Type": "application/json" },
  });
};
