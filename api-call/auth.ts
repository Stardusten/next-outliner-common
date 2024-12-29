import {
  AdminLoginSchema,
  KbEditorLoginSchema,
} from "../type-and-schemas/api/auth";
import { usePostApi } from "../helper-functions/usePostApi";

export const adminLogin = usePostApi(
  "/login/admin",
  AdminLoginSchema.request,
  AdminLoginSchema.result,
);

export const kbEditorLogin = usePostApi(
  "/login/kb-editor",
  KbEditorLoginSchema.request,
  KbEditorLoginSchema.result,
);
