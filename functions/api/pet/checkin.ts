/**
 * POST /api/pet/checkin
 *
 * Daily check-in endpoint.
 * Awards EXP bonus + streak bonus for consecutive sign-ins.
 * Enforces one check-in per calendar day (server-enforced).
 */

import { getLevelFromExp, getLevelUpEffect } from "../../lib/pet";

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

  // Get pet
  const pet = await DB.prepare(
    "SELECT id, level, exp, streak_days, last_checkin_date FROM pets WHERE user_id = ?"
  ).bind(userId).first();

  if (!pet) {
    return new Response(JSON.stringify({ code: 404, message: "请先领养宠物", data: null }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const petId = pet.id as number;
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  // Check if already checked in today
  const lastCheckin = pet.last_checkin_date as string | null;
  if (lastCheckin && lastCheckin.slice(0, 10) === today) {
    return new Response(JSON.stringify({
      code: 0,
      message: "今天已经签到过了，明天再来吧~",
      data: {
        checkedIn: false,
        streakDays: pet.streak_days as number,
        expGained: 0,
        today,
      },
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Calculate streak
  let streakDays = (pet.streak_days as number) || 0;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (lastCheckin && lastCheckin.slice(0, 10) === yesterdayStr) {
    // Consecutive: increment streak
    streakDays += 1;
  } else {
    // Broken streak or first checkin: reset to 1
    streakDays = 1;
  }

  // Calculate EXP
  const baseExp = 10;              // base checkin reward
  const streakBonus = Math.min(streakDays - 1, 5) * 5; // max +25 streak bonus
  const totalExp = baseExp + streakBonus;

  // Update pet
  const currentExp = (pet.exp as number) + totalExp;
  const newLevel = getLevelFromExp(currentExp);
  const levelEffect = getLevelUpEffect(pet.level as number, newLevel);

  await DB.prepare(
    "UPDATE pets SET exp = ?, level = ?, streak_days = ?, last_checkin_date = ?, updated_at = ? WHERE id = ?"
  ).bind(currentExp, newLevel, streakDays, today, new Date().toISOString(), petId).run();

  // Log growth
  await DB.prepare(
    "INSERT INTO pet_growth_logs (pet_id, action, exp_delta, exp_after, detail, created_at) VALUES (?, 'checkin', ?, ?, ?, ?)"
  ).bind(petId, totalExp, currentExp,
    levelEffect.leveledUp ? `签到+升级到Lv.${newLevel}` : `签到第${streakDays}天`,
    new Date().toISOString()
  ).run();

  // Insert checkin log
  try {
    await DB.prepare(
      "INSERT INTO pet_checkin_logs (pet_id, checkin_date, streak_days, exp_gained, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(petId, today, streakDays, totalExp, new Date().toISOString()).run();
  } catch {
    // Table may not exist yet — non-fatal
  }

  return new Response(JSON.stringify({
    code: 0,
    message: levelEffect.leveledUp
      ? `签到成功！连续${streakDays}天 +${totalExp}EXP，升级到Lv.${newLevel}！`
      : `签到成功！连续${streakDays}天，+${totalExp}EXP！`,
    data: {
      checkedIn: true,
      streakDays,
      expGained: totalExp,
      baseExp,
      streakBonus,
      currentExp,
      currentLevel: newLevel,
      today,
      levelEffect: levelEffect.leveledUp
        ? {
            leveledUp: true,
            fromLevel: levelEffect.fromLevel,
            toLevel: levelEffect.toLevel,
            isHatch: levelEffect.isHatch,
            isMaxLevel: levelEffect.isMaxLevel,
            toToken: levelEffect.toToken,
          }
        : null,
    },
  }), {
    headers: { "Content-Type": "application/json" },
  });
};
