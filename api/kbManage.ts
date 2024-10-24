import { z } from "zod";
import { NormalizedDatabaseSchema } from "../../modules/config";
import { createPostApi } from "./utils";

export const GetAllKbInfoSchema = {
  request: z.object({}),
  result: NormalizedDatabaseSchema.array(),
};

export const GetKbInfoSchema = createPostApi(
  "/get-all-kb-info",
  z.object({}),
  NormalizedDatabaseSchema.array(),
);
