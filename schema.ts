import { z } from "zod";

export const loginSchema__Params = z.object({
  password: z.string(),
});

export const loginSchema__Result = z.object({
  token: z.string(),
});

export const wsSchema__Params = z.object({
  location: z.string(),
  authorization: z.string(),
});
