import { z } from "zod";
import { usePostApi } from "./utils";

export const GetAllKbInfoSchema = {
  request: z.object({}),
  result: z.array(
    z.object({
      name: z.string(),
      location: z.string(),
    }),
  ),
};

export const getAllKbInfo = usePostApi(
  "/get-all-kb-info",
  z.object({}),
  GetAllKbInfoSchema.result,
);

export const CreateKbSchema = {
  request: z.object({
    location: z.string(),
    name: z.string(),
    password: z.string(),
  }),
  result: z.object({}),
};

export const createKb = usePostApi(
  "/create-kb",
  CreateKbSchema.request,
  CreateKbSchema.result,
);

export const RenameKbSchema = {
  request: z.object({
    location: z.string(),
    newName: z.string(),
  }),
  result: z.object({}),
};

export const renameKb = usePostApi(
  "/rename-kb",
  RenameKbSchema.request,
  RenameKbSchema.result,
);
