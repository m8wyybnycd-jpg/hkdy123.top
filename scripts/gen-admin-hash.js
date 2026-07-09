/**
 * Generate PBKDF2 password hash for D1 admin user creation.
 * Uses the same algorithm as functions/lib/auth.ts:
 * - SHA-256
 * - 100000 iterations
 * - 256-bit key length
 * - 16-byte salt
 */

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = "SHA-256";
const PBKDF2_KEY_LENGTH = 256; // bits
const SALT_LENGTH = 16; // bytes

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return Buffer.from(binary, "binary").toString("base64");
}

async function hashPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH
  );

  return {
    hash: bufferToBase64(hashBuffer),
    salt: bufferToBase64(saltBytes.buffer),
  };
}

// Generate a strong random password
function generatePassword(length = 16) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%";
  const random = crypto.getRandomValues(new Uint8Array(length));
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[random[i] % chars.length];
  }
  return password;
}

async function main() {
  const password = generatePassword(16);
  const { hash, salt } = await hashPassword(password);
  const timestamp = new Date().toISOString();

  console.log("=== Admin User Creation ===");
  console.log("Email: 1290734087@qq.com");
  console.log("Password:", password);
  console.log("Hash:", hash);
  console.log("Salt:", salt);
  console.log("Timestamp:", timestamp);
  console.log("");
  console.log("=== SQL INSERT ===");
  console.log(`INSERT INTO users (email, username, password_hash, salt, created_at, updated_at, is_admin) VALUES ('1290734087@qq.com', 'admin', '${hash}', '${salt}', '${timestamp}', '${timestamp}', 1);`);
  console.log("");
  console.log("=== SQL Assign Role ===");
  console.log(`INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u, roles r WHERE u.email = '1290734087@qq.com' AND r.code = 'super_admin';`);
}

main().catch(console.error);
