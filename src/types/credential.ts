/**
 * Credential management type definitions.
 *
 * Used by the admin credential management page and API client.
 * Credential values are always masked on the frontend — never exposed in plaintext.
 */

/** Supported credential authentication types. */
export type CredentialType = "api_key" | "token" | "oauth" | "certificate";

/** Credential operational status. */
export type CredentialStatus = "active" | "expired" | "revoked" | "error";

/** Health check result status. */
export type HealthStatus = "healthy" | "unhealthy" | "unknown";

/** A credential item as returned by the admin API (value always masked). */
export interface CredentialItem {
  /** Numeric credential ID. */
  id: number;
  /** Human-readable name (e.g. "讯飞MaaS APIKey"). */
  name: string;
  /** Credential type: api_key / token / oauth / certificate. */
  type: CredentialType;
  /** Service provider identifier (e.g. "xfyun", "brevo"). */
  provider: string;
  /** API endpoint URL associated with this credential. */
  endpointUrl: string;
  /** Masked value preview (e.g. "sk-x****626"), never the full secret. */
  maskedValue: string;
  /** JSON metadata (e.g. model_id, extra_headers). */
  metadata: Record<string, unknown>;
  /** Current operational status. */
  status: CredentialStatus;
  /** Last health check timestamp (ISO 8601), null if never checked. */
  lastHealthCheck: string | null;
  /** Last health check result. */
  lastHealthStatus: HealthStatus;
  /** Whether auto-renewal is enabled. */
  autoRenew: boolean;
  /** Credential expiration time (ISO 8601), null = never expires. */
  expiresAt: string | null;
  /** Creation timestamp. */
  createdAt: string;
  /** Last update timestamp. */
  updatedAt: string;
}

/** Payload for creating a new credential. */
export interface CreateCredentialPayload {
  name: string;
  type: CredentialType;
  provider?: string;
  endpointUrl?: string;
  /** Plaintext secret value — only sent on create, never returned. */
  value: string;
  metadata?: Record<string, unknown>;
  status?: CredentialStatus;
  autoRenew?: boolean;
  expiresAt?: string | null;
}

/** Payload for updating an existing credential. All fields optional. */
export interface UpdateCredentialPayload {
  name?: string;
  type?: CredentialType;
  provider?: string;
  endpointUrl?: string;
  /** New plaintext value — only sent when rotating the key. */
  value?: string;
  metadata?: Record<string, unknown>;
  status?: CredentialStatus;
  autoRenew?: boolean;
  expiresAt?: string | null;
}

/** Result of a credential connection test / health check. */
export interface CredentialTestResult {
  /** Whether the credential is healthy. */
  healthy: boolean;
  /** HTTP response code (null for non-HTTP checks like certificate expiry). */
  responseCode: number | null;
  /** Response latency in milliseconds. */
  latencyMs: number | null;
  /** Human-readable status message. */
  message: string;
  /** Updated credential status after the test. */
  status: CredentialStatus;
  /** Credential type label. */
  type: string;
}
