import { z } from "zod";

export type Dirents = Record<
  string,
  | { isDirectory: true; name: string; subDirents: Dirents }
  | { isDirectory: false; name: string }
>;

export const DirentsSchema = z.record(
  z.string(),
  z.discriminatedUnion("isDirectory", [
    z.object({
      isDirectory: z.literal(true),
      name: z.string(),
      subDirents: z.lazy(() => DirentsSchema),
    }),
    z.object({
      isDirectory: z.literal(false),
      name: z.string(),
    }),
  ]),
) as z.ZodType<Dirents>;
