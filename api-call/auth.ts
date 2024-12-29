import {
  AdminLoginSchema,
  KbEditorLoginSchema,
} from "../type-and-schemas/api/auth";
import { usePostApi } from "../helper-functions/usePostApi";

export const adminLogin = usePostApi(
  "/admin-login",
  AdminLoginSchema.request,
  AdminLoginSchema.result,
);

export const kbEditorLogin = usePostApi(
  "/kb-editor-login",
  KbEditorLoginSchema.request,
  KbEditorLoginSchema.result,
);
