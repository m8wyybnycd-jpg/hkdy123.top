import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../../lib/response";

/**
 * POST /api/admin/banners/upload-image — 图片上传代理。
 * 需要 banner:write 权限。
 *
 * 接收 multipart/form-data（field: file），代理到 Cloudflare Images API。
 * 需在项目 Secrets 中配置 CF_ACCOUNT_ID 和 CF_IMAGES_TOKEN。
 *
 * 如果 CF Images 未配置，返回错误提示前端使用 URL 粘贴方式。
 *
 * 返回：{ code: 0, data: { imageUrl: "https://imagedelivery.net/..." } }
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:write");
  if (denied) return denied;

  const { CF_ACCOUNT_ID, CF_IMAGES_TOKEN } = context.env as Env & {
    CF_ACCOUNT_ID?: string;
    CF_IMAGES_TOKEN?: string;
  };

  // 检查 Cloudflare Images 配置
  if (!CF_ACCOUNT_ID || !CF_IMAGES_TOKEN) {
    return badRequest(
      "图片上传服务未配置，请使用粘贴 URL 方式添加图片"
    );
  }

  // 解析 multipart/form-data
  let formData: FormData;
  try {
    formData = await context.request.formData();
  } catch {
    return badRequest("无法解析表单数据");
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return badRequest("请选择要上传的图片文件");
  }

  // 客户端校验（二次校验）
  if (!file.type.startsWith("image/")) {
    return badRequest("仅支持图片文件");
  }
  if (file.size > 10 * 1024 * 1024) {
    return badRequest("图片大小不能超过 10MB");
  }

  try {
    // 构建 Cloudflare Images API 请求
    const cfFormData = new FormData();
    cfFormData.append("file", file);

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_IMAGES_TOKEN}`,
        },
        body: cfFormData,
      }
    );

    if (!cfResponse.ok) {
      const errText = await cfResponse.text();
      console.error("Cloudflare Images API error:", errText);
      return serverError("图片上传失败，请稍后重试");
    }

    const cfData = (await cfResponse.json()) as {
      success: boolean;
      result?: { variants?: string[] };
      errors?: { code: number; message: string }[];
    };

    if (!cfData.success || !cfData.result?.variants?.length) {
      return serverError("图片上传失败：未返回图片 URL");
    }

    // 使用第一个 variant 作为图片 URL（通常是 public 变体）
    const imageUrl = cfData.result.variants[0];

    return jsonResponse({ imageUrl }, "上传成功");
  } catch (err) {
    console.error("图片上传异常:", err);
    return serverError("图片上传异常，请稍后重试");
  }
};
