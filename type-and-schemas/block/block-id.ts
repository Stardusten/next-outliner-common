import { z } from "zod";

export const BlockIdSchema = z.string();
export type BlockId = z.infer<typeof BlockIdSchema>;
