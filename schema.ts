import { z } from "zod";

export const loginSchema__Params = z.object({
  password: z.string(),
});

export const loginSchema__Result = z.object({
  token: z.string(),
});

export const fetchWebpageTitleSchema__Params = z.object({
  url: z.string(),
});

export const fetchWebpageTitleSchema__Result = z.object({
  title: z.string(),
});

