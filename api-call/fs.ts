import { type AxiosInstance } from "axios";
import { usePostApi } from "../helper-functions/usePostApi";
import {
  FsEnsureAttachmentsDirSchema,
  FsGetAttachmentSignedUrlSchema,
  FsLsSchema,
  FsStatSchema,
  FsUploadSchema,
} from "../type-and-schemas/api/fs";
import { RESP_CODES } from "../constants";
import { RespSchema } from "../type-and-schemas/resp";
import { z } from "zod";

export const fsLs = usePostApi(`/fs/ls`, FsLsSchema.request, FsLsSchema.result);

export const fsStat = usePostApi(`/fs/stat`, FsStatSchema.request, FsStatSchema.result);

/**
 * @param files [targetPath, File][]
 */
export const fsUpload = async (
  files: [string, File][],
  config?: z.infer<typeof FsUploadSchema.request>,
) => {
  const endpoint = `/fs/upload`;
  try {
    // 要使用这个函数，必须将 () => AxiosInstance 挂载到 globalThis 上
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
      console.error(
        `[INVALID_RESPONSE] endpoint=${endpoint}}, response=${JSON.stringify(res.data)}, validationErrors=${JSON.stringify(result.error.errors)}`,
      );
      return { success: false, code: RESP_CODES.INVALID_RESPONSE };
    }

    return { success: true, code: RESP_CODES.SUCCESS };
  } catch (error) {
    console.error(`[UNKNOWN_ERROR] endpoint=${endpoint}}, error=${error}`);
    return { success: false, code: RESP_CODES.UNKNOWN_ERROR };
  }
};

export const fsEnsureAttachmentsDir = usePostApi(
  `/fs/ensure-attachments-dir`,
  FsEnsureAttachmentsDirSchema.request,
  FsEnsureAttachmentsDirSchema.result,
);

export const fsGetAttachmentSignedUrl = usePostApi(
  `/fs/get-attachment-signed-url`,
  FsGetAttachmentSignedUrlSchema.request,
  FsGetAttachmentSignedUrlSchema.result,
);
