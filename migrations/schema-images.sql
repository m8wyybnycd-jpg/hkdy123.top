-- schema-images.sql: 图片库模块 (Gallery)
-- D1 表存储 Cloudflare Images 上传后的图片元数据。
-- 图片文件本身由 CF Images 托管，D1 只存元数据。

CREATE TABLE IF NOT EXISTS images (
  id            TEXT PRIMARY KEY,                  -- UUID v4
  name          TEXT NOT NULL,                     -- 用户自定义名称（可重命名）
  url           TEXT NOT NULL,                     -- CF Images variant URL (public)
  file_size     INTEGER NOT NULL,                  -- 文件大小（字节）
  mime_type     TEXT NOT NULL DEFAULT 'image/png', -- MIME 类型
  width         INTEGER,                           -- 图片宽度（px）
  height        INTEGER,                           -- 图片高度（px）
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_name ON images(name);
