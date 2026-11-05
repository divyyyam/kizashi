import { z } from "zod";
import { unixSecondsSchema } from "./common";

const positiveUsdcSchema = z.string().regex(/^[1-9][0-9]*$/);
export const allowedShapeSchema = z.enum(["binary", "curve", "range"]);

export const ruleSetSchema = z
  .object({
    budgetUsdc: positiveUsdcSchema,
    perTradeCapUsdc: positiveUsdcSchema,
    dailyCapUsdc: positiveUsdcSchema,
    maxLossPerMarketUsdc: positiveUsdcSchema,
    maxDrawdownUsdc: positiveUsdcSchema,
    stopAtSec: unixSecondsSchema,
    allowedMarketIds: z.array(z.string().min(1)),
    allowedShapes: z.array(allowedShapeSchema),
    notes: z.string(),
  })
  .strict();

export type RuleSet = z.infer<typeof ruleSetSchema>;
