import rateLimit from "express-rate-limit";
import crypto from "crypto";
import type { Request } from "express";

const hash = (s: string) =>
  crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const max = Number(process.env.RATE_LIMIT_MAX || 100);

export const routerLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const auth = req.headers.authorization || "";
    // Rate limit per API key if provided, otherwise by IP
    return auth ? `key:${hash(auth)}` : `ip:${req.ip}`;
  },
  message: { error: "Rate limit exceeded" }
});
