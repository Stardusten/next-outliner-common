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

export const FsLsSchema = {
  request: z.object({
    basePath: z.string(),
    includeHidden: z.boolean().optional(),
    recursive: z.boolean().optional(),
    maxDepth: z.number().optional(),
  }),
  result: DirentsSchema,
};

export const FsStatSchema = {
  request: z.object({
    path: z.string(),
  }),
  result: z.object({
    ctime: z.coerce.date(),
    mtime: z.coerce.date(),
    size: z.number(),
  }),
};

export const FsUploadSchema = {
  request: z.object({
    // 是否覆盖已存在的文件
    overwrite: z.boolean().optional(),
    // 是否创建不存在的目录
    mkdir: z.boolean().optional(),
  }),
  result: z.any(),
};
