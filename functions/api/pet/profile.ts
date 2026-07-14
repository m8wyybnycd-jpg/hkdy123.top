/**
 * GET /api/pet/profile
 * 
 * Returns the current user's pet profile, including level progress,
 * recent conversations count, and memory count.
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

  const pet = await DB.prepare(
    "SELECT id, user_id, name, level, exp, state, mood, total_chats, total_browses, total_likes, hatched_at, created_at, updated_at FROM pets WHERE user_id = ?"
  ).bind(userId).first();

  if (!pet) {
    return new Response(JSON.stringify({
      code: 0,
      message: "还没有宠物",
      data: { pet: null },
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get memory count
  const memCount = await DB.prepare(
    "SELECT COUNT(*) as count FROM pet_memories WHERE pet_id = ?"
  ).bind(pet.id as number).first();

  // Get today's exp
  const todayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';
  const todayExp = await DB.prepare(
    "SELECT COALESCE(SUM(exp_delta), 0) as total FROM pet_growth_logs WHERE pet_id = ? AND created_at >= ?"
  ).bind(pet.id as number, todayStart).first();

  return new Response(JSON.stringify({
    code: 0,
    message: "success",
    data: {
      pet,
      memoryCount: (memCount?.count as number) || 0,
      todayExp: (todayExp?.total as number) || 0,
    },
  }), {
    headers: { "Content-Type": "application/json" },
  });
};
