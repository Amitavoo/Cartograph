import crypto from "crypto";
import { AgentTokenPayload } from "./types";

const DEFAULT_SECRET = process.env.AGENT_TOKEN_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.CLERK_SECRET_KEY ||
  "cartograph_agent_signing_secret_key_default";

/**
 * Creates a base64url encoded string.
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Decodes a base64url encoded string.
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Computes an HMAC-SHA256 signature.
 */
function signData(data: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export interface CreateTokenOptions {
  analysisId: string;
  organizationId: string;
  sessionId?: string;
  expiresInSeconds?: number;
  secret?: string;
}

/**
 * Generates a short-lived signed credential that binds an agent session
 * to a specific analysis and organization.
 */
export function createAgentToken(options: CreateTokenOptions): string {
  const {
    analysisId,
    organizationId,
    sessionId = crypto.randomUUID(),
    expiresInSeconds = 300, // 5 minutes default
    secret = DEFAULT_SECRET,
  } = options;

  if (!analysisId) throw new Error("analysisId is required for agent token");
  if (!organizationId) throw new Error("organizationId is required for agent token");

  const now = Date.now();
  const payload: AgentTokenPayload = {
    analysisId,
    organizationId,
    sessionId,
    issuedAt: now,
    expiresAt: now + expiresInSeconds * 1000,
  };

  const payloadString = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadString);
  const signature = signData(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export interface VerifyTokenOptions {
  expectedAnalysisId?: string;
  expectedOrganizationId?: string;
  secret?: string;
  now?: number;
}

export interface VerifyTokenResult {
  valid: boolean;
  payload?: AgentTokenPayload;
  error?: string;
  code?: "EXPIRED" | "INVALID_SIGNATURE" | "MALFORMED" | "ANALYSIS_MISMATCH" | "TENANT_MISMATCH";
}

/**
 * Verifies a short-lived agent token, checking cryptographic signature,
 * timestamp expiry, and organization/analysis scoping.
 */
export function verifyAgentToken(
  token: string | null | undefined,
  options?: VerifyTokenOptions
): VerifyTokenResult {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Missing or invalid token format", code: "MALFORMED" };
  }

  // Strip optional "Bearer " prefix
  const cleanToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
  const parts = cleanToken.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Malformed agent token", code: "MALFORMED" };
  }

  const [encodedPayload, signature] = parts;
  const secret = options?.secret || DEFAULT_SECRET;

  // Verify HMAC-SHA256 signature using constant-time comparison
  const expectedSignature = signData(encodedPayload, secret);
  try {
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, error: "Invalid token signature", code: "INVALID_SIGNATURE" };
    }
  } catch {
    return { valid: false, error: "Invalid token signature", code: "INVALID_SIGNATURE" };
  }

  // Parse payload
  let payload: AgentTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return { valid: false, error: "Invalid token payload encoding", code: "MALFORMED" };
  }

  const currentTime = options?.now ?? Date.now();

  // Check expiration
  if (currentTime > payload.expiresAt) {
    return {
      valid: false,
      payload,
      error: `Agent credential has expired (expired at ${new Date(payload.expiresAt).toISOString()})`,
      code: "EXPIRED",
    };
  }

  // Check analysis scoping
  if (options?.expectedAnalysisId && payload.analysisId !== options.expectedAnalysisId) {
    return {
      valid: false,
      payload,
      error: `Token scope mismatch: issued for analysis "${payload.analysisId}", but attempted to access "${options.expectedAnalysisId}"`,
      code: "ANALYSIS_MISMATCH",
    };
  }

  // Check organization scoping
  if (options?.expectedOrganizationId && payload.organizationId !== options.expectedOrganizationId) {
    return {
      valid: false,
      payload,
      error: `Tenant isolation violation: issued for organization "${payload.organizationId}", but attempted to access organization "${options.expectedOrganizationId}"`,
      code: "TENANT_MISMATCH",
    };
  }

  return { valid: true, payload };
}
