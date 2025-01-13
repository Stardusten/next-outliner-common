import { z } from "zod";

export type Dirents = Record<
  string,
  | {
      isDirectory: true;
      name: string;
      ctime: Date;
      mtime: Date;
      size: number;
      subDirents: Dirents;
    }
  | {
      isDirectory: false;
      name: string;
      ctime: Date;
      mtime: Date;
      size: number;
    }
>;

export const DirentsSchema = z.record(
  z.string(),
  z.discriminatedUnion("isDirectory", [
    z.object({
      isDirectory: z.literal(true),
      name: z.string(),
      ctime: z.coerce.date(),
      mtime: z.coerce.date(),
      size: z.number(),
      subDirents: z.lazy(() => DirentsSchema),
    }),
    z.object({
      isDirectory: z.literal(false),
      name: z.string(),
      ctime: z.coerce.date(),
      mtime: z.coerce.date(),
      size: z.number(),
    }),
  ]),
) as z.ZodType<Dirents>;
