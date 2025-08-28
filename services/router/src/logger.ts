import pino from "pino";
import pinoHttp from "pino-http";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

export const logger = pino({
  level: process.env.ROUTER_LOG_LEVEL || "info",
  redact: {
    paths: ["req.headers.authorization"],
    censor: "[redacted]"
  }
});

export const hash = (s: string) =>
  crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers["x-request-id"]?.toString() || uuidv4(),
  customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : "info"),
  serializers: {
    req: (req) => ({
      id: (req as any).id,
      method: req.method,
      url: req.url,
      apiKeyHash:
        typeof req.headers.authorization === "string"
          ? hash(req.headers.authorization)
          : undefined
    }),
    res: (res) => ({
      statusCode: res.statusCode
    })
  }
});
