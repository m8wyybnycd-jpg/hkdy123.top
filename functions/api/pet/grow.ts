/**
 * POST /api/pet/grow
 * 
 * Award experience points for actions (browse, like).
 * Used when user browses a new page or likes a pet reply.
 */

import { checkDailyExpLimit, EXP_RULES, getLevelFromExp } from "../../lib/pet";

interface GrowRequest {
  action: 'browse' | 'like';
  detail?: string;
}

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

  let body: GrowRequest;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ code: 400, message: "无效请求", data: null }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const action = body.action;
  if (action !== 'browse' && action !== 'like') {
    return new Response(JSON.stringify({ code: 400, message: "无效的操作类型", data: null }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const pet = await DB.prepare("SELECT id, exp, level FROM pets WHERE user_id = ?").bind(userId).first();
  if (!pet) {
    return new Response(JSON.stringify({ code: 404, message: "请先领养宠物", data: null }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const petId = pet.id as number;
  const canGain = await checkDailyExpLimit(DB, petId, action);
  
  if (!canGain) {
    return new Response(JSON.stringify({
      code: 0,
      message: "今日经验已达上限",
      data: { expGained: 0, leveledUp: false, currentExp: pet.exp, currentLevel: pet.level },
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const expDelta = EXP_RULES[action];
  const currentExp = (pet.exp as number) + expDelta;
  const currentLevel = pet.level as number;
  const newLevel = getLevelFromExp(currentExp);
  const leveledUp = newLevel > currentLevel;

  // Update pet
  const updateField = action === 'browse' ? 'total_browses' : 'total_likes';
  await DB.prepare(
    `UPDATE pets SET exp = ?, level = ?, ${updateField} = ${updateField} + 1, updated_at = ? WHERE id = ?`
  ).bind(currentExp, newLevel, new Date().toISOString(), petId).run();

  // Log growth
  await DB.prepare(
    "INSERT INTO pet_growth_logs (pet_id, action, exp_delta, exp_after, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(petId, action, expDelta, currentExp, body.detail || '', new Date().toISOString()).run();

  // Hatching
  if (newLevel >= 2 && currentLevel < 2) {
    await DB.prepare("UPDATE pets SET hatched_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), petId).run();
  }

  return new Response(JSON.stringify({
    code: 0,
    message: leveledUp ? `恭喜！你的精灵升级到了Lv.${newLevel}！` : `获得${expDelta}经验值`,
    data: { expGained: expDelta, leveledUp, currentExp, currentLevel: newLevel },
  }), {
    headers: { "Content-Type": "application/json" },
  });
};
