/**
 * POST /api/pet/adopt
 * 
 * Register user adopts a pet (egg state, level 1).
 * If user already has a pet, returns existing pet.
 */
export const onRequestPost = async (context: PageContext): Promise<Response> => {
  const { DB } = context.env;
  const user = context.data?.user;

  if (!user) {
    return new Response(JSON.stringify({ code: 401, message: "请先登录", data: null }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = user.userId as number;

  // Check if pet already exists
  const existingPet = await DB.prepare(
    "SELECT id, user_id, name, level, exp, state, mood, total_chats, total_browses, total_likes, streak_days, last_checkin_date, hatched_at, created_at, updated_at FROM pets WHERE user_id = ?"
  ).bind(userId).first();

  if (existingPet) {
    return new Response(JSON.stringify({
      code: 0,
      message: "你已经有一只宠物了",
      data: { pet: existingPet },
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create new pet (egg state)
  const timestamp = new Date().toISOString();
  await DB.prepare(
    "INSERT INTO pets (user_id, name, level, exp, state, mood, created_at, updated_at) VALUES (?, '云玩精灵', 1, 0, 'idle', 'happy', ?, ?)"
  ).bind(userId, timestamp, timestamp).run();

  const newPet = await DB.prepare(
    "SELECT id, user_id, name, level, exp, state, mood, total_chats, total_browses, total_likes, streak_days, last_checkin_date, hatched_at, created_at, updated_at FROM pets WHERE user_id = ?"
  ).bind(userId).first();

  return new Response(JSON.stringify({
    code: 0,
    message: "宠物已领养！快去孵化它吧~",
    data: { pet: newPet },
  }), {
    headers: { "Content-Type": "application/json" },
  });
};
