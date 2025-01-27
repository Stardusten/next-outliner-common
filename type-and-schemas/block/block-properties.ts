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

export const blockPropertyDefaults: Record<BlockProperties[string]["type"], any> = {
  decimal: { type: "decimal", value: 0 },
  float: { type: "float", value: 0 },
  plaintext: { type: "plaintext", value: "" },
  richtext: { type: "richtext", value: "", ctext: "" },
  date: { type: "date", value: new Date().toISOString().split("T")[0] },
  datetime: { type: "datetime", value: new Date().toISOString() },
  select: { type: "select", value: "", options: [] },
  multiselect: { type: "multiselect", value: [], options: [] },
  checkbox: { type: "checkbox", value: false },
  email: { type: "email", value: "" },
  phone: { type: "phone", value: "" },
};
