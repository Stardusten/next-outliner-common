import type { AxiosInstance, AxiosResponse } from "axios";
import { z } from "zod";
import { RESP_CODES } from "../constants";

export const createPostApi = <PARAMS_SCHEMA extends z.ZodType, RESULT_SCHEMA extends z.ZodType>(
  getAxios: () => AxiosInstance | null | undefined,
  endpoint: string,
  paramsSchema: PARAMS_SCHEMA,
  resultSchema: RESULT_SCHEMA,
  effect?: (result: z.infer<RESULT_SCHEMA>) => Promise<void> | void,
) => {
  return async (params: z.infer<PARAMS_SCHEMA>) => {
    const axios = getAxios();
    if (!axios) {
      return { code: RESP_CODES.NO_AXIOS, data: undefined };
    }

    try {
      const res = await axios.post(endpoint, params);
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
        if (import.meta.env.DEV) {
          console.error(`[INVALID_RESPONSE] endpoint=${endpoint}, params=${JSON.stringify(params)}, response=${JSON.stringify(res.data)}, validationErrors=${JSON.stringify(result.error.errors)}`);
        }
        return { code: RESP_CODES.INVALID_RESPONSE, data: undefined };
      }

      if (effect) {
        await effect(result.data.data);
      }

      return result.data;
    } catch (error) {
      console.error(`[UNKNOWN_ERROR] endpoint=${endpoint}, params=${JSON.stringify(params)}, error=${JSON.stringify(error)}`);
      return { code: RESP_CODES.UNKNOWN_ERROR, data: undefined };
    }
  };
}