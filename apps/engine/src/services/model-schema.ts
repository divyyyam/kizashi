import { z } from "zod";

type Json = unknown;

function rewrite(node: Json): Json {
  if (Array.isArray(node)) return node.map(rewrite);
  if (typeof node !== "object" || node === null) return node;
  const out: Record<string, Json> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "$schema" || key === "additionalProperties") continue;
    if (key === "const") out.enum = [value];
    else if (key === "oneOf") out.anyOf = rewrite(value);
    else out[key] = rewrite(value);
  }
  return out;
}

/**
 * Gemini's response_schema rejects JSON Schema `const` (what zod literals emit) and `oneOf`.
 * Send an equivalent schema (`enum` of one value, `anyOf`); callers still parse every reply
 * with the original zod schema, so validation is unchanged.
 */
export function modelSchema(schema: z.ZodType): Record<string, Json> {
  return rewrite(z.toJSONSchema(schema, { io: "output" })) as Record<string, Json>;
}
