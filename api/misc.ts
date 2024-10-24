import { z } from "zod";
import { createPostApi } from "./utils";

export const FetchWebpageTitleSchema = {
  request: z.object({
    webpageUrl: z.string(),
  }),
  result: z.object({
    title: z.string(),
  }),
};

export const fetchWebpageTitle = createPostApi(
  "/fetch-webpage-title",
  FetchWebpageTitleSchema.request,
  FetchWebpageTitleSchema.result,
);
