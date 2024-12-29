import { z } from "zod";

export const RoleTypeSchema = z.enum(["admin", "kb-editor", "visitor"]);
export type RoleType = z.infer<typeof RoleTypeSchema>;
