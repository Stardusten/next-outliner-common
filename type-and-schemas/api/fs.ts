import { z } from "zod";
import { DirentsSchema } from "../dirents";

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
  result: z.undefined(),
};

export const FsEnsureAttachmentsDirSchema = {
  request: z.object({}),
  result: z.any(),
};

export const FsGetAttachmentSignedUrlSchema = {
  request: z.object({
    path: z.string(),
    attachment: z.boolean().optional(),
    inferMimeType: z.boolean().optional(),
  }),
  result: z.object({
    signedUrl: z.string(),
  }),
};

export const ClearScannedImageSchema = {
  request: z.object({
    path: z.string(),
  }),
  result: z.object({
    path: z.string(),
  }),
};

export const FsDeleteSchema = {
  request: z.object({
    path: z.string(),
  }),
  result: z.object({}),
};

export const FsRenameSchema = {
  request: z.object({
    path: z.string(),
    newName: z.string(),
  }),
  result: z.object({}),
};
