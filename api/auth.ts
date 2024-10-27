import { z } from "zod";
import { usePostApi } from "./utils";

// 以管理员身份登陆
// 管理员密码在 config.yml 中设置，管理员可以增加、修改、删除知识库
export const AdminLoginSchema = {
  request: z.object({
    serverUrl: z.string(),
    password: z.string(),
  }),
  result: z.object({
    token: z.string(),
  }),
};

export const adminLogin = usePostApi(
  "/admin-login",
  AdminLoginSchema.request,
  AdminLoginSchema.result,
);

// 以知识库编辑者身份登陆
// 知识库编辑者密码在知识库的 config.yml 中设置，知识库编辑者只能查看和编辑对应知识库的内容
export const KbEditorLoginSchema = {
  request: z.object({
    serverUrl: z.string(),
    location: z.string(),
    password: z.string(),
  }),
  result: z.object({
    token: z.string(),
  }),
};

export const kbEditorLogin = usePostApi(
  "/kb-editor-login",
  KbEditorLoginSchema.request,
  KbEditorLoginSchema.result,
);

