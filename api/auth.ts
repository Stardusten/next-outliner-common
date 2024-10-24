import { z } from "zod";

export const AuthSchema = {
  request: z.object({
    password: z.string(),
  }),
  result: z.object({
    token: z.string(),
  }),
};