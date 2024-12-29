import { usePostApi } from "../helper-functions/usePostApi";
import { PingSchema } from "../type-and-schemas/api/misc";

export const ping = usePostApi("/ping", PingSchema.request, PingSchema.result);
