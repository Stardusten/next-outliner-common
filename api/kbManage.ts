import { z } from "zod";
import { createPostApi } from "./utils";
import { NormalizedDatabaseSchema } from "../types";

export const GetAllKbInfoSchema = {
  request: z.object({}),
  result: NormalizedDatabaseSchema.array(),
};

export const getAllKbInfo = createPostApi(
  "/get-all-kb-info",
  z.object({}),
  NormalizedDatabaseSchema.array(),
);
