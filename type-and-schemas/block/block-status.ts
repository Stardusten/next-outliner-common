import { z } from "zod";

// first 2 bits:
//   00 - normal block
//   01 - mirror block
//   10 - virtual block
// 3rd bit:
//   0 - folded
//   1 - expanded
export const BlockStatusSchema = z.number().min(0).max(5 /* 101 */);

export type BlockStatus = z.infer<typeof BlockStatusSchema>;
