import { z } from "zod";

export const JwtPayloadSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("admin"),
    serverUrl: z.string(),
  }),
  z.object({
    role: z.literal("kb-editor"),
    serverUrl: z.string(),
    location: z.string(),
  }),
]);
