import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { z } from "zod";
import { RESP_CODES } from "../constants";
import { RespSchema, type Resp } from "../types";

export const usePostApi = <PARAMS_SCHEMA extends z.ZodType, RESULT_SCHEMA extends z.ZodType>(
  endpoint: string,
  paramsSchema: PARAMS_SCHEMA,
  resultSchema: RESULT_SCHEMA,
) => {
  return async (
    params: z.infer<PARAMS_SCHEMA>,
    config?: AxiosRequestConfig,
  ): Promise<Resp<z.infer<RESULT_SCHEMA>>> => {
    try {
      // 要使用这个函数，必须将 axios 的 getter 挂载到 globalThis 上
      let axios: AxiosInstance;
      try {
        axios = (globalThis as any).getAxios();
      } catch (error) {
        console.error(`[NO_AXIOS] ${error}`);
        return { success: false, code: RESP_CODES.NO_AXIOS };
      }

      const res = await axios.post(endpoint, params, config);
      if (!res) {
        console.error(`[EMPTY_RESPONSE] endpoint=${endpoint}, params=${JSON.stringify(params)}`);
        return { success: false, code: RESP_CODES.UNKNOWN_ERROR };
      }

      const resSchema = RespSchema(resultSchema);
      const result = resSchema.safeParse(res.data);

      if (!result.success) {
        console.error(
          `[INVALID_RESPONSE] endpoint=${endpoint}, params=${JSON.stringify(params)}, response=${JSON.stringify(res.data)}, validationErrors=${JSON.stringify(result.error.errors)}`,
        );
        return { success: false, code: RESP_CODES.INVALID_RESPONSE };
      }

      return result.data as any; // XXX
    } catch (error) {
      console.error(
        `[UNKNOWN_ERROR] endpoint=${endpoint}, params=${JSON.stringify(params)}, error=$`,
        error,
      );
      return { success: false, code: RESP_CODES.UNKNOWN_ERROR };
    }
  };
};
