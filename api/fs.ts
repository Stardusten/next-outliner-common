import { z } from "zod";

export type Dirent =
  | { isDirectory: true; name: string; subDirents: Dirent[] }
  | { isDirectory: false; name: string };

export const DirentSchema = z.discriminatedUnion("isDirectory", [
  z.object({
    isDirectory: z.literal(true),
    name: z.string(),
    subDirents: z.lazy(() => z.array(DirentSchema)),
  }),
  z.object({
    isDirectory: z.literal(false),
    name: z.string(),
  }),
]) as z.ZodType<Dirent>;

export const LsSchema = {
  request: z.object({
    basePath: z.string(),
    includeHidden: z.boolean().optional(),
    recursive: z.boolean().optional(),
    maxDepth: z.number().optional(),
  }),
  result: z.array(DirentSchema),
}

export const StatSchema = {
  request: z.object({
    path: z.string(),
  }),
  result: z.object({
    ctime: z.coerce.date(),
    mtime: z.coerce.date(),
    size: z.number(),
  }),
}

export const UploadSchema = {
  request: z.object({
    // 是否覆盖已存在的文件
    overwrite: z.boolean().optional(),
    // 是否创建不存在的目录
    mkdir: z.boolean().optional(),
  }),
  result: z.any(),
}