import { z } from "zod";

export const PingSchema = {
  request: z.object({}),
  result: z.object({}),
};

export const FetchWebpageTitleSchema = {
  request: z.object({
    webpageUrl: z.string(),
  }),
  result: z.object({
    title: z.string(),
  }),
};
