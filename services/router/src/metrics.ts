import client from "prom-client";
import type { Request, Response, NextFunction } from "express";

export const registry = new client.Registry();

// default process metrics
client.collectDefaultMetrics({ register: registry });

export const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["route", "method", "status"] as const
});

export const httpDuration = new client.Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request duration in ms",
  labelNames: ["route", "method", "status"] as const,
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
});

export const mcpToolCalls = new client.Counter({
  name: "mcp_tool_calls_total",
  help: "Total MCP tool calls",
  labelNames: ["tool"] as const
});

registry.registerMetric(httpRequestCounter);
registry.registerMetric(httpDuration);
registry.registerMetric(mcpToolCalls);

// Simple Express middleware to time/label requests
export function metricsMiddleware(routeLabel: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const end = httpDuration.startTimer({ route: routeLabel, method: req.method });
    res.on("finish", () => {
      const status = String(res.statusCode);
      httpRequestCounter.inc({ route: routeLabel, method: req.method, status });
      end({ route: routeLabel, method: req.method, status });
    });
    next();
  };
}
