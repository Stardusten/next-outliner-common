import { usePostApi } from "../helper-functions/usePostApi";
import {
  FetchWebpageTitleSchema,
  PingSchema,
} from "../type-and-schemas/api/misc";

export const ping = usePostApi("/ping", PingSchema.request, PingSchema.result);

export const fetchWebpageTitle = usePostApi(
  "/fetch-webpage-title",
  FetchWebpageTitleSchema.request,
  FetchWebpageTitleSchema.result,
);
