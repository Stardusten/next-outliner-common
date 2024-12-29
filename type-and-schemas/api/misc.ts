import { z } from "zod";

export const PingSchema = {
  request: z.object({}),
  result: z.object({}),
};
