import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../lib/response";
import { requirePermission } from "../../lib/permission";
import { logOperation, getClientIP } from "../../lib/logger";

/**
 * POST /admin/banners/upload-image — 上传轮播图图片。
 *
 * 需要 banner:write 权限。
 *
 * 支持两种模式：
 * 1. multipart/form-data 上传文件 → 代理上传到 Cloudflare Images API
 * 2. JSON body { imageUrl: "xxx" } → 直接返回该 URL（降级模式）
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:write");
  if (denied) return denied;

  const contentType = context.request.headers.get("Content-Type") || "";

  try {
    // ── 降级模式：前端直接传 URL ──────────────────────
    if (contentType.includes("application/json")) {
      const body = await context.request.json<Record<string, unknown>>();
      const imageUrl = body.imageUrl as string;

      if (!imageUrl) {
        return badRequest("imageUrl 为必填项");
      }

      // Log the operation
      const { DB } = context.env;
      const user = context.data.user;
      if (DB) {
        await logOperation(DB, {
          userId: user.userId,
          username: user.username,
          action: "upload-image-url",
          module: "banner",
          ip: getClientIP(context.request),
          detail: { imageUrl },
        });
      }

      return jsonResponse({ imageUrl });
    }

    // ── 文件上传模式：代理上传到 Cloudflare Images ────
    if (contentType.includes("multipart/form-data")) {
      const formData = await context.request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return badRequest("file 为必填项");
      }

      const accountId = context.env.CF_ACCOUNT_ID as string;
      const imagesToken = context.env.CF_IMAGES_TOKEN as string;

      if (!accountId || !imagesToken) {
        // No Cloudflare Images credentials — fallback to returning
        // an error suggesting the URL-passing approach
        return serverError(
          "未配置 Cloudflare Images，请使用 imageUrl 方式上传"
        );
      }

      // Upload to Cloudflare Images API
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const uploadResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${imagesToken}`,
          },
          body: uploadFormData,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Cloudflare Images upload failed:", errorText);
        return serverError("图片上传失败");
      }

      const uploadResult = await uploadResponse.json<Record<string, unknown>>();
      const resultData = uploadResult.result as Record<string, unknown>;

      // Construct the delivery URL
      // Cloudflare Images returns an id; the delivery URL is:
      // https://imagedelivery.net/<account_hash>/<image_id>/<variant>
      const imageId = resultData.id as string;
      const imageUrl = `https://imagedelivery.net/${accountId}/${imageId}/public`;

      // Log the operation
      const { DB } = context.env;
      const user = context.data.user;
      if (DB) {
        await logOperation(DB, {
          userId: user.userId,
          username: user.username,
          action: "upload-image-file",
          module: "banner",
          ip: getClientIP(context.request),
          detail: { imageId },
        });
      }

      return jsonResponse({ imageUrl });
    }

    return badRequest("Content-Type 必须为 multipart/form-data 或 application/json");
  } catch (err) {
    console.error("图片上传异常:", err);
    return serverError("图片上传失败");
  }
};

/**
 * Handle unsupported methods.
 */
export const onRequest = async (context: PageContext): Promise<Response> => {
  const method = context.request.method;
  if (method === "POST") {
    return context.next();
  }
  return new Response(
    JSON.stringify({ code: 405, data: null, message: `不支持的请求方法: ${method}` }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
};
