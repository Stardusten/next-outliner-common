import { z } from "zod";
import { RESP_CODES_NAMES } from "../constants";

export const RespSchema = (dataSchema: z.ZodType) => {
  return z.discriminatedUnion("success", [
    z.object({ success: z.literal(true), data: dataSchema }),
    z.object({
      success: z.literal(false),
      code: z.number(),
      msg: z.string().optional(),
    }),
  ]);
};

export type Resp<DATA> =
  | { success: true; data: DATA }
  | { success: false; code: keyof typeof RESP_CODES_NAMES; msg?: string };
