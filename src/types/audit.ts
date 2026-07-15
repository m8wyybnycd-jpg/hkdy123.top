/**
 * Security audit type definitions.
 *
 * Used by the admin Audit page and API client.
 * Maps to `user_status_logs`, `credential_audit_logs`,
 * and `credential_decrypt_logs` D1 tables.
 */

// ── User Status Log Types ─────────────────────────────────

/** Action types recorded in user_status_logs. */
export type UserStatusAction = "ban" | "unban" | "level_change" | "role_change";

/** A user status change log entry. */
export interface UserStatusLog {
  /** Numeric log ID. */
  id: number;
  /** Target user ID. */
  userId: number;
  /** Action type. */
  action: UserStatusAction;
  /** Previous value (e.g. old level). */
  oldValue: string | null;
  /** New value (e.g. new level). */
  newValue: string | null;
  /** Operator user ID. */
  operatorId: number | null;
  /** Operator name. */
  operatorName: string | null;
  /** Reason for the change. */
  reason: string | null;
  /** Timestamp (ISO 8601). */
  createdAt: string;
  /** User email (joined from users table). */
  userEmail?: string;
}

// ── Credential Audit Log Types ────────────────────────────

/** Credential audit action types. */
export type CredentialAuditAction =
  | "create"
  | "view"
  | "update"
  | "delete"
  | "test"
  | "renew";

/** A credential audit log entry. */
export interface CredentialAuditLog {
  /** Numeric log ID. */
  id: number;
  /** Credential ID. */
  credentialId: number;
  /** Action type. */
  action: CredentialAuditAction;
  /** Operator user ID. */
  operatorId: number | null;
  /** Operator name. */
  operatorName: string;
  /** Operator IP address. */
  ip: string;
  /** JSON detail string. */
  detail: string;
  /** Timestamp (ISO 8601). */
  createdAt: string;
  /** Credential name (joined from credentials table). */
  credentialName?: string;
}

// ── Credential Decrypt Log Types ──────────────────────────

/** A credential decryption audit log entry. */
export interface CredentialDecryptLog {
  /** Numeric log ID. */
  id: number;
  /** Credential ID. */
  credentialId: number;
  /** Credential name. */
  credentialName: string;
  /** Encryption key version used. */
  keyVersion: number | null;
  /** Whether decryption succeeded. */
  success: boolean;
  /** IP that triggered the decryption. */
  callerIp: string;
  /** User ID that triggered the decryption. */
  callerUserId: number | null;
  /** Internal service name (e.g. "pet/chat"). */
  callerService: string;
  /** Error message (if decryption failed). */
  errorMessage: string;
  /** Timestamp (ISO 8601). */
  createdAt: string;
}

// ── Unified Audit Entry (for combined view) ───────────────

/** Audit log source type. */
export type AuditSource = "user_status" | "credential_audit" | "credential_decrypt";

/** A unified audit log entry for display in the audit page. */
export interface UnifiedAuditLog {
  /** Numeric log ID. */
  id: number;
  /** Source table. */
  source: AuditSource;
  /** Timestamp (ISO 8601). */
  createdAt: string;
  /** Operator / caller name. */
  operatorName: string;
  /** Action type (source-specific). */
  action: string;
  /** Target description (e.g. "user:42" or "credential:5"). */
  target: string;
  /** Human-readable detail. */
  detail: string;
  /** IP address. */
  ip: string;
  /** Whether this is a high-risk security event. */
  isAnomaly: boolean;
}

/** Query parameters for audit log endpoints. */
export interface AuditLogQueryParams {
  /** Page number (1-based). */
  page?: number;
  /** Items per page. */
  pageSize?: number;
  /** Filter by action type. */
  action?: string;
  /** Filter by operator name. */
  operator?: string;
  /** Date range start (ISO 8601). */
  dateFrom?: string;
  /** Date range end (ISO 8601). */
  dateTo?: string;
}
