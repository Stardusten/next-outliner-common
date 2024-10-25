import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { z } from "zod";
import { RESP_CODES } from "../constants";

export const createPostApi = <PARAMS_SCHEMA extends z.ZodType, RESULT_SCHEMA extends z.ZodType>(
  endpoint: string,
  paramsSchema: PARAMS_SCHEMA,
  resultSchema: RESULT_SCHEMA,
) => {
  return async (params: z.infer<PARAMS_SCHEMA>, config?: AxiosRequestConfig) => {
    try {
      // 要使用这个函数，必须将 axios 的 getter 挂载到 globalThis 上
      let axios: AxiosInstance;
      try {
        axios = (globalThis as any).getAxios();
      } catch (error) {
        console.error(`[NO_AXIOS] ${error}`);
        return { code: RESP_CODES.NO_AXIOS, data: undefined };
      }

      const res = await axios.post(endpoint, params, config);
      if (!res) {
        console.error(`[EMPTY_RESPONSE] endpoint=${endpoint}, params=${JSON.stringify(params)}`);
        return { code: RESP_CODES.UNKNOWN_ERROR, data: undefined };
      }

      const resSchema = z.object({
        code: z.number(),
        data: resultSchema.optional(),
      });
      const result = resSchema.safeParse(res.data);

      if (!result.success) {
        console.error(
          `[INVALID_RESPONSE] endpoint=${endpoint}, params=${JSON.stringify(params)}, response=${JSON.stringify(res.data)}, validationErrors=${JSON.stringify(result.error.errors)}`,
        );
        return { code: RESP_CODES.INVALID_RESPONSE, data: undefined };
      }

      return result.data;
    } catch (error) {
      console.error(
        `[UNKNOWN_ERROR] endpoint=${endpoint}, params=${JSON.stringify(params)}, error=${JSON.stringify(error)}`,
      );
      return { code: RESP_CODES.UNKNOWN_ERROR, data: undefined };
    }
  };
};
