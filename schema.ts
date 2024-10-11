import { z } from "zod";

export const loginSchema__Params = z.object({
  username: z.string(),
  password: z.string(),
});

export const loginSchema__Result = z.object({
  token: z.string(),
});