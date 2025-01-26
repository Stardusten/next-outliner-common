import { z } from "zod";

export const BlockPropertiesSchema = z.record(
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("decimal"), value: z.number() }),
    z.object({ type: z.literal("float"), value: z.number() }),
    z.object({ type: z.literal("plaintext"), value: z.string() }),
    z.object({ type: z.literal("richtext"), value: z.any(), ctext: z.string() }),
    z.object({ type: z.literal("date"), value: z.string() }),
    z.object({ type: z.literal("datetime"), value: z.string() }),
    z.object({
      type: z.literal("select"),
      value: z.string(),
      options: z.array(z.string()),
    }),
    z.object({
      type: z.literal("multiselect"),
      value: z.array(z.string()),
      options: z.array(z.string()),
    }),
    z.object({ type: z.literal("checkbox"), value: z.boolean() }),
    z.object({ type: z.literal("email"), value: z.string() }),
    z.object({ type: z.literal("phone"), value: z.string() }),
  ]),
);

export type BlockProperties = z.infer<typeof BlockPropertiesSchema>;

export const BlockPropertyDefaultValues: Record<BlockProperties[string]["type"], any> = {
  decimal: 0,
  float: 0,
  plaintext: "",
  richtext: "",
  date: new Date().toISOString().split("T")[0],
  datetime: new Date().toISOString(),
  select: "",
  multiselect: [],
  checkbox: false,
  email: "",
  phone: "",
};
