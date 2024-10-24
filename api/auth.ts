import { z } from "zod";
import { createPostApi } from "./utils";

export const LoginSchema = {
  request: z.object({
    password: z.string(),
  }),
  result: z.object({
    token: z.string(),
  }),
};

export const login = createPostApi(
  "/login",
  LoginSchema.request,
  LoginSchema.result,
);