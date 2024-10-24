import { z } from "zod";

export const FetchWebpageTitleSchema = {
  request: z.object({
    webpageUrl: z.string(),
  }),
  result: z.object({
    title: z.string(),
  }),
};
