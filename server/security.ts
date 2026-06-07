/**
 * Security Utilities
 * Rate limiting, audit logging, and security-related functionality
 */

import { Request, Response, NextFunction } from "express";
import * as db from "./db";

/**
 * Rate Limiter Configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  message?: string;
}

/**
 * In-memory rate limit store
 * For production, use Redis for distributed rate limiting
 */
class RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.resetTime > now) {
      existing.count++;
      return existing;
    }

    const entry = { count: 1, resetTime: now + windowMs };
    this.store.set(key, entry);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return entry;
  }

  private cleanup(): void {
    const now = Date.now();
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      const value = this.store.get(key);
      if (value && value.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }
}

const rateLimitStore = new RateLimitStore();

/**
 * Create rate limiting middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip || "unknown",
    message = "Too many requests, please try again later.",
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const { count, resetTime } = rateLimitStore.increment(key, windowMs);

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(resetTime / 1000));

    if (count > maxRequests) {
      res.status(429).json({
        error: "rate_limit_exceeded",
        message,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      });
      return;
    }

    next();
  };
}

/**
 * Pre-configured rate limiters
 */
export const rateLimiters = {
  // General API: 100 requests per minute
  api: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),

  // Auth: 10 requests per minute
  auth: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: "Too many authentication attempts. Please wait a minute.",
  }),

  // Document upload: 10 per minute
  upload: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: "Upload rate limit exceeded. Please wait before uploading more files.",
  }),

  // Chat messages: 30 per minute
  chat: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: "Chat rate limit exceeded. Please slow down.",
  }),

  // LLM inference: 20 per minute
  inference: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: "Too many AI requests. Please wait before sending more messages.",
  }),
};

/**
 * Audit Log Entry
 */
export interface AuditLogEntry {
  userId?: number;
  action: string;
  resource: string;
  resourceId?: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: "success" | "failure" | "error";
}

/**
 * Log an audit event
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // In a real implementation, this would write to the database
    console.log("[Audit]", JSON.stringify(entry));
    
    // TODO: Implement database persistence when db functions are added
    // await db.createAuditLog(entry);
  } catch (error) {
    console.error("[Audit] Failed to log event:", error);
  }
}

/**
 * Create audit logging middleware
 */
export function createAuditMiddleware(
  resource: string,
  action: string,
  getResourceId?: (req: Request) => number | undefined
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send.bind(res);

    // Intercept response to log after completion
    res.send = function (this: Response, body: unknown) {
      const responseTime = Date.now() - startTime;
      const status = res.statusCode >= 400 ? "failure" : "success";

      logAuditEvent({
        userId: (req as any).user?.id,
        action,
        resource,
        resourceId: getResourceId?.(req),
        details: {
          method: req.method,
          path: req.path,
          responseTime,
          statusCode: res.statusCode,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        status,
      });

      return originalSend(body);
    } as typeof res.send;

    next();
  };
}

/**
 * Security Headers Middleware
 */
export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // Prevent XSS attacks
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );

  // Strict Transport Security
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  next();
}

/**
 * Input Sanitization
 */
export function sanitizeInput(input: string): string {
  // Remove potential XSS vectors
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}

/**
 * Validate and sanitize file path to prevent path traversal
 */
export function sanitizeFilePath(path: string): string {
  // Remove null bytes and path traversal attempts
  return path
    .replace(/\0/g, "")
    .replace(/\.\./g, "")
    .replace(/[<>:"|?*]/g, "")
    .trim();
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

/**
 * Hash sensitive data for logging (don't log raw secrets)
 */
export function hashForLogging(data: string): string {
  // Simple hash for logging purposes - not for security
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `hash:${Math.abs(hash).toString(16)}`;
}

/**
 * Check if request is from a known bot/crawler
 */
export function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;

  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /headless/i,
    /phantom/i,
    /selenium/i,
    /puppeteer/i,
  ];

  return botPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  // API keys should be prefixed with 'cb_' and be 32+ characters
  return /^cb_[a-zA-Z0-9]{28,}$/.test(apiKey);
}
