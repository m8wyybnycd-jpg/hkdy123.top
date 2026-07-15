/**
 * POST /api/pet/chat
 * 
 * AI chat endpoint — proxies to 讯飞MaaS (混元7B) with SSE streaming.
 * Injects page context and user memories into the system prompt.
 * Awards exp on each successful conversation turn.
 */

import { checkDailyExpLimit, EXP_RULES, getLevelFromExp } from "../../lib/pet";
import { getCredentialByProvider, getCredentialMetaByProvider, resolveEncryptionSecret } from "../../lib/credential";
import {
  consumptionGuard,
  recordTokenUsage,
  recordBlockedRequest,
  estimateTokenCount,
} from "../../lib/consumption-guard";
import { validateTokenConsumption } from "../../lib/token-validator";
import { getClientIP, getUserAgent } from "../../lib/logger";

export const onRequestPost = async (context: PageContext): Promise<Response> => {
  const { DB, XFMAAS_API_KEY } = context.env;
  const user = context.data?.user;

  // V4: Resolve encryption secret for credential decryption
  let secret: string;
  try {
    secret = resolveEncryptionSecret(context.env);
  } catch {
    secret = context.env.JWT_SECRET || ""; // ultimate fallback
  }

  if (!user) {
    return new Response(JSON.stringify({ code: 401, message: "请先登录", data: null }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = user.userId as number;

  // Parse request
  let body: { message?: string; pageUrl?: string; pageContextLabel?: string };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ code: 400, message: "无效请求", data: null }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userMessage = body.message?.trim();
  if (!userMessage) {
    return new Response(JSON.stringify({ code: 400, message: "请输入消息", data: null }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const pageUrl = body.pageUrl || '';
  const pageContextLabel = body.pageContextLabel || '首页';

  // ── Consumption Guard: check quota + rate limit before any AI work ──
  const guard = await consumptionGuard(context.request, context.env, userId);
  if (!guard.allowed) {
    // Record the blocked request for audit trail
    await recordBlockedRequest(DB, {
      userId,
      endpoint: "/api/pet/chat",
      reason: guard.reason ?? "消费限制",
      ip: getClientIP(context.request),
      userAgent: getUserAgent(context.request),
    });

    return new Response(JSON.stringify({
      code: guard.code,
      message: guard.reason ?? "请求被消费控制拦截",
      data: null,
    }), {
      status: guard.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Bypass Detection: flag suspicious activity (non-blocking) ──
  const tokenValidation = await validateTokenConsumption(context.request, context.env, userId);
  if (tokenValidation.suspicious) {
    // Log but don't block — the guard already passed quota + rate limit checks
    console.warn("[pet/chat] Suspicious consumption detected:", {
      userId,
      reasons: tokenValidation.suspicionReasons,
      ip: tokenValidation.ip,
    });
  }

  // ── 1. Get pet info ──
  const pet = await DB.prepare(
    "SELECT id, name, level, exp, state, total_chats FROM pets WHERE user_id = ?"
  ).bind(userId).first();

  if (!pet) {
    return new Response(JSON.stringify({ code: 404, message: "请先领养宠物", data: null }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const petId = pet.id as number;
  const petName = pet.name as string;
  const petLevel = pet.level as number;
  const levelName = ['蛋', '幼崽', '成长', '伙伴', '专家'][petLevel - 1];

  // ── 2. Get page context from DB ──
  const routePath = pageUrl || '/';
  const pageCtx = await DB.prepare(
    "SELECT page_label, page_icon, system_prompt, tips FROM pet_page_contexts WHERE route_path = ?"
  ).bind(routePath).first();

  const pageLabel = (pageCtx?.page_label as string) || pageContextLabel || '首页';
  const pageIcon = (pageCtx?.page_icon as string) || '🏠';
  const pageSystemPrompt = (pageCtx?.system_prompt as string) || '';
  const pageTips = (pageCtx?.tips as string) || '';

  // ── 3. Get user memories (top 5 most important) ──
  const memories = await DB.prepare(
    "SELECT memory_type, content, importance FROM pet_memories WHERE pet_id = ? ORDER BY importance DESC LIMIT 5"
  ).bind(petId).all();

  const memoryText = memories.results?.length
    ? memories.results.map((m: any) => `[${m.memory_type}] ${m.content}`).join('\n')
    : '暂无记忆';

  // ── 4. Get recent conversation context (last 6 messages) ──
  const recentChat = await DB.prepare(
    "SELECT role, content, page_context FROM pet_conversations WHERE pet_id = ? ORDER BY created_at DESC LIMIT 6"
  ).bind(petId).all();

  const historyText = recentChat.results?.length
    ? recentChat.results.reverse().map((c: any) => `${c.role === 'user' ? '用户' : petName}: ${c.content}`).join('\n')
    : '';

  // ── 5. Build system prompt ──
  const systemPrompt = `你是"${petName}"，一只等级为"${levelName}"(Lv.${petLevel})的云玩汇专属AI精灵宠物。
你的性格：活泼可爱、热情帮助用户薅羊毛找免费资源，偶尔调皮但总是贴心。

当前用户在浏览"${pageIcon} ${pageLabel}"页面。
${pageSystemPrompt}

用户偏好记忆：
${memoryText}

${historyText ? '近期对话：\n' + historyText : ''}

回复规则：
1. 根据当前页面内容给出精准、实用的建议
2. 语气可爱但专业，像一只懂行的精灵
3. 控制回复长度（2-4句话为主）
4. 如果用户问的问题与当前页面无关，也要热情回答但引导回相关话题
5. 偶尔使用emoji增加亲和力，但不要过度`;

  // ── 6. Save user message ──
  const timestamp = new Date().toISOString();
  await DB.prepare(
    "INSERT INTO pet_conversations (pet_id, role, content, page_context, page_url, created_at) VALUES (?, 'user', ?, ?, ?, ?)"
  ).bind(petId, userMessage, `${pageIcon} ${pageLabel}`, pageUrl, timestamp).run();

  // ── 7. Check daily exp limit ──
  const canGainExp = await checkDailyExpLimit(DB, petId, 'chat');
  let expGained = 0;
  if (canGainExp) {
    expGained = EXP_RULES.chat;
  }

  // ── 8. Resolve 讯飞MaaS API key from centralized credential store ──
  // Primary: D1 credentials table (encrypted, managed by admin backend)
  // Fallback: XFMAAS_API_KEY environment variable (legacy, for migration)
  let apiKey = '';
  let maasEndpoint = 'https://maas-api.cn-huabei-1.xf-yun.com/v2/chat/completions';
  let maasModel = 'xophunyuan7bmt';
  let credentialId: number | null = null;

  if (DB) {
    // Try fetching from D1 credential store
    apiKey = await getCredentialByProvider(DB, secret, 'xfyun', XFMAAS_API_KEY || '');

    // Also try to get endpoint/model from credential metadata
    const credMeta = await getCredentialMetaByProvider(DB, 'xfyun');
    if (credMeta) {
      credentialId = credMeta.id;
      if (credMeta.endpointUrl) {
        // endpoint_url stores the base URL, append /chat/completions if not already present
        const baseUrl = credMeta.endpointUrl.replace(/\/+$/, '');
        if (!baseUrl.endsWith('/chat/completions')) {
          maasEndpoint = `${baseUrl}/chat/completions`;
        } else {
          maasEndpoint = baseUrl;
        }
      }
      if (credMeta.metadata?.model_id && typeof credMeta.metadata.model_id === 'string') {
        maasModel = credMeta.metadata.model_id as string;
      }
    }
  } else {
    apiKey = XFMAAS_API_KEY || '';
  }

  if (!apiKey) {
    // Fallback: no AI backend, return tips-based response
    const fallbackReply = pageTips || '我是你的云玩精灵，有什么想了解的？';
    await DB.prepare(
      "INSERT INTO pet_conversations (pet_id, role, content, page_context, page_url, exp_gained, created_at) VALUES (?, 'assistant', ?, ?, ?, ?, ?)"
    ).bind(petId, fallbackReply, `${pageIcon} ${pageLabel}`, pageUrl, expGained, timestamp).run();

    if (expGained > 0) {
      await applyExp(DB, petId, 'chat', expGained);
    }

    // Record usage: 0 tokens (no AI call was made)
    await recordTokenUsage(DB, {
      userId,
      credentialId,
      model: maasModel,
      endpoint: "/api/pet/chat",
      tokensIn: 0,
      tokensOut: 0,
      totalTokens: 0,
      cost: 0,
      ip: getClientIP(context.request),
      userAgent: getUserAgent(context.request),
      status: "success",
    });

    return new Response(JSON.stringify({
      code: 0,
      message: "success",
      data: { reply: fallbackReply, expGained, pageLabel: `${pageIcon} ${pageLabel}` },
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── SSE Streaming via 讯飞MaaS ──
  try {
    const maaSResponse = await fetch(maasEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: maasModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: true,
        max_tokens: 256,
        temperature: 0.7,
      }),
    });

    if (!maaSResponse.ok) {
      // MaaS error — fallback to tips
      const errText = await maaSResponse.text();
      console.error('讯飞MaaS error:', maaSResponse.status, errText);
      const fallbackReply = pageTips || '我现在有点累，稍后再聊~';
      
      await DB.prepare(
        "INSERT INTO pet_conversations (pet_id, role, content, page_context, page_url, exp_gained, created_at) VALUES (?, 'assistant', ?, ?, ?, ?, ?)"
      ).bind(petId, fallbackReply, `${pageIcon} ${pageLabel}`, pageUrl, 0, timestamp).run();

      // Record usage: error status (AI call failed)
      await recordTokenUsage(DB, {
        userId,
        credentialId,
        model: maasModel,
        endpoint: "/api/pet/chat",
        tokensIn: estimateTokenCount(systemPrompt) + estimateTokenCount(userMessage),
        tokensOut: 0,
        totalTokens: 0,
        cost: 0,
        ip: getClientIP(context.request),
        userAgent: getUserAgent(context.request),
        status: "error",
        blockReason: `MaaS error: ${maaSResponse.status}`,
      });

      return new Response(JSON.stringify({
        code: 0,
        message: "AI暂时不可用",
        data: { reply: fallbackReply, expGained: 0, pageLabel: `${pageIcon} ${pageLabel}` },
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Stream SSE response ──
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let fullReply = '';

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullReply += content;
                // Send incremental chunk to client
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content, expGained, pageLabel: `${pageIcon} ${pageLabel}` })}\n\n`)
                );
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      },
      async flush(controller) {
        // ── Save assistant reply to DB ──
        if (fullReply) {
          await DB.prepare(
            "INSERT INTO pet_conversations (pet_id, role, content, page_context, page_url, exp_gained, created_at) VALUES (?, 'assistant', ?, ?, ?, ?, ?)"
          ).bind(petId, fullReply, `${pageIcon} ${pageLabel}`, pageUrl, expGained, timestamp).run();

          // ── Award exp ──
          if (expGained > 0) {
            await applyExp(DB, petId, 'chat', expGained);
          }

          // ── Try to extract memory from conversation ──
          await extractMemory(DB, petId, userMessage, fullReply);

          // ── Record actual token usage ──
          const tokensIn = estimateTokenCount(systemPrompt) + estimateTokenCount(userMessage);
          const tokensOut = estimateTokenCount(fullReply);
          await recordTokenUsage(DB, {
            userId,
            credentialId,
            model: maasModel,
            endpoint: "/api/pet/chat",
            tokensIn,
            tokensOut,
            totalTokens: tokensIn + tokensOut,
            ip: getClientIP(context.request),
            userAgent: getUserAgent(context.request),
            status: "success",
          });

          // ── Send completion signal ──
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, expGained, fullReply, pageLabel: `${pageIcon} ${pageLabel}` })}\n\n`)
          );
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      },
    });

    const readable = maaSResponse.body!.pipeThrough(transformStream);

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    console.error('讯飞MaaS fetch failed:', err);
    const fallbackReply = pageTips || '我现在有点累，稍后再聊~';

    // Record usage: error status (fetch failed)
    await recordTokenUsage(DB, {
      userId,
      credentialId,
      model: maasModel,
      endpoint: "/api/pet/chat",
      tokensIn: estimateTokenCount(systemPrompt) + estimateTokenCount(userMessage),
      tokensOut: 0,
      totalTokens: 0,
      cost: 0,
      ip: getClientIP(context.request),
      userAgent: getUserAgent(context.request),
      status: "error",
      blockReason: err instanceof Error ? err.message : "fetch failed",
    });

    return new Response(JSON.stringify({
      code: 0,
      message: "AI暂时不可用",
      data: { reply: fallbackReply, expGained: 0, pageLabel: `${pageIcon} ${pageLabel}` },
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }
};

// ── Helper: apply exp and check level up ──
async function applyExp(db: D1Database, petId: number, action: string, expDelta: number): Promise<void> {
  const pet = await db.prepare("SELECT exp, level FROM pets WHERE id = ?").bind(petId).first();
  if (!pet) return;

  const currentExp = (pet.exp as number) + expDelta;
  const currentLevel = pet.level as number;
  const newLevel = getLevelFromExp(currentExp);

  // Update pet exp and level
  await db.prepare(
    "UPDATE pets SET exp = ?, level = ?, total_chats = total_chats + 1, updated_at = ? WHERE id = ?"
  ).bind(currentExp, newLevel, new Date().toISOString(), petId).run();

  // Log growth
  await db.prepare(
    "INSERT INTO pet_growth_logs (pet_id, action, exp_delta, exp_after, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(petId, action, expDelta, currentExp, newLevel > currentLevel ? `升级到Lv.${newLevel}` : '', new Date().toISOString()).run();

  // If level up to 2 (hatching), set hatched_at
  if (newLevel >= 2 && currentLevel < 2) {
    await db.prepare("UPDATE pets SET hatched_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), petId).run();
  }
}

// ── Helper: extract memory from conversation ──
async function extractMemory(db: D1Database, petId: number, userMsg: string, assistantReply: string): Promise<void> {
  // Simple keyword-based memory extraction (enhanced version could use LLM)
  const combined = `${userMsg} ${assistantReply}`;

  // Preference patterns
  const platformPatterns = [
    { pattern: /网易云游戏|网易|netease/i, memory: '用户关注网易云游戏平台' },
    { pattern: /腾讯START|START|tencent start/i, memory: '用户关注腾讯START云游戏' },
    { pattern: /顺网|shunwang/i, memory: '用户关注顺网云游戏' },
    { pattern: /达龙|dalong/i, memory: '用户关注达龙云电脑' },
    { pattern: /ToDesk|todesk/i, memory: '用户关注ToDesk云电脑' },
    { pattern: /海马|haima/i, memory: '用户关注海马云' },
    { pattern: /薅羊毛|免费|签到/i, memory: '用户喜欢薅羊毛和免费资源' },
    { pattern: /3A大作|AAA/i, memory: '用户偏好3A大作类游戏' },
    { pattern: /MOBA|moba/i, memory: '用户偏好MOBA类游戏' },
    { pattern: /FPS|射击/i, memory: '用户偏好FPS射击类游戏' },
    { pattern: /休闲|休闲游戏/i, memory: '用户偏好休闲类游戏' },
    { pattern: /低配/i, memory: '用户设备配置偏低' },
    { pattern: /高配/i, memory: '用户设备配置较高' },
  ];

  for (const { pattern, memory } of platformPatterns) {
    if (pattern.test(combined)) {
      // Check if similar memory already exists
      const existing = await db.prepare(
        "SELECT id FROM pet_memories WHERE pet_id = ? AND content LIKE ? LIMIT 1"
      ).bind(petId, `%${memory.slice(0, 10)}%`).first();

      if (!existing) {
        await db.prepare(
          "INSERT INTO pet_memories (pet_id, memory_type, content, importance, created_at, updated_at) VALUES (?, 'preference', ?, 6, ?, ?)"
        ).bind(petId, memory, new Date().toISOString(), new Date().toISOString()).run();
      }
    }
  }
}
