import { z } from "node_modules/zod/lib";

// 更新 UI 时，这个块时改变的源头，因此是不需要更新的
export const BlockOriginSchema = z
  .any()
  .pipe(
    z.union([
      z.object({ type: z.literal("ui"), changeSources: z.array(z.string()).optional() }),
      z.object({ type: z.literal("local") }),
      z.object({ type: z.literal("remote") }),
    ]),
  );

export type BlockOrigin = z.infer<typeof BlockOriginSchema>;
