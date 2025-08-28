export type RouteTarget = "official" | "custom";

const WRITE_PAT = /(create|update|append|patch|delete|post)/i;

export type RouterCatalog = {
  official: Map<string, any>;
  custom: Map<string, any>;
};

export function decideTarget(toolName: string, cat: RouterCatalog): RouteTarget {
  const hasOfficial = cat.official.has(toolName);
  const hasCustom   = cat.custom.has(toolName);
  const isWrite = WRITE_PAT.test(toolName);

  // Prefer official if it has the tool and it's not a write
  if (hasOfficial && !isWrite) return "official";

  // Writes → custom
  if (isWrite && hasCustom) return "custom";

  // Otherwise prefer official if it exists, else custom
  if (hasOfficial) return "official";
  if (hasCustom) return "custom";

  // Default fallback: custom (will 404 from MCP if unknown)
  return "custom";
}
