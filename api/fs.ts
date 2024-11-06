import { z } from "zod";
import { usePostApi } from "./utils";
import type { AxiosInstance } from "axios";
import { RESP_CODES } from "../constants";
import { RespSchema } from "../types";

const PREFIX = "/fs";

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

export const fsLs = usePostApi(
  `${PREFIX}/ls`,
  FsLsSchema.request,
  FsLsSchema.result,
);

export const FsStatSchema = {
  request: z.object({
    path: z.string(),
  }),
  result: z.object({
    ctime: z.coerce.date(),
    mtime: z.coerce.date(),
    size: z.number(),
  }),
}

export const fsStat = usePostApi(
  `${PREFIX}/stat`,
  FsStatSchema.request,
  FsStatSchema.result,
);

export const FsUploadSchema = {
  request: z.object({
    // 是否覆盖已存在的文件
    overwrite: z.boolean().optional(),
    // 是否创建不存在的目录
    mkdir: z.boolean().optional(),
  }),
  result: z.undefined(),
}

/**
 * @param files [targetPath, File][]
 */
export const fsUpload = async (files: [string, File][], config?: z.infer<typeof FsUploadSchema.request>) => {
  const endpoint = `${PREFIX}/upload`;
  try {
    // 要使用这个函数，必须将 axios 的 getter 挂载到 globalThis 上
    let axios: AxiosInstance;
    try {
      axios = (globalThis as any).getAxios();
    } catch (error) {
      console.error(`[NO_AXIOS] ${error}`);
      return { success: false, code: RESP_CODES.NO_AXIOS };
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("targetPath", file[0]);
      formData.append("file", file[1]);
    });

    const res = await axios.post(endpoint, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      params: config,
    });

    if (!res) {
      console.error(`[EMPTY_RESPONSE] endpoint=${endpoint}`);
      return { success: false, code: RESP_CODES.UNKNOWN_ERROR };
    }

    const resSchema = RespSchema(FsUploadSchema.result);
    const result = resSchema.safeParse(res.data);

    if (!result.success) {
      console.error(`[INVALID_RESPONSE] endpoint=${endpoint}}, response=${JSON.stringify(res.data)}, validationErrors=${JSON.stringify(result.error.errors)}`);
      return { success: false, code: RESP_CODES.INVALID_RESPONSE };
    }

    return { success: true, code: RESP_CODES.SUCCESS };
  } catch (error) {
    console.error(`[UNKNOWN_ERROR] endpoint=${endpoint}}, error=${error}`);
    return { success: false, code: RESP_CODES.UNKNOWN_ERROR };
  }
}

export const fsEnsureAttachmentsDirSchema = {
  request: z.object({}),
  result: z.any(),
}

export const fsEnsureAttachmentsDir = usePostApi(
  `${PREFIX}/ensure-attachments-dir`,
  fsEnsureAttachmentsDirSchema.request,
  fsEnsureAttachmentsDirSchema.result,
);

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

export const fsGetAttachmentSignedUrl = usePostApi(
  `${PREFIX}/get-attachment-signed-url`,
  FsGetAttachmentSignedUrlSchema.request,
  FsGetAttachmentSignedUrlSchema.result,
);

