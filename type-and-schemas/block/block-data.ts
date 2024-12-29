import { z } from "zod";
import { BlockContentSchema } from "./block-content";

export const BlockDataSchema = z.tuple([
  // content (only for normal blocks)
  BlockContentSchema.nullable(),
  // metadata
  z.record(z.any()),
]);

export type BlockData = z.infer<typeof BlockDataSchema>;
