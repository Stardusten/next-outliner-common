import { z } from "zod";
import {
  CreateKbSchema,
  GetAllKbInfoSchema,
  RenameKbSchema,
} from "../type-and-schemas/api/kb";
import { usePostApi } from "../helper-functions/usePostApi";

export const getAllKbInfo = usePostApi(
  "/kb/list",
  z.object({}),
  GetAllKbInfoSchema.result,
);

export const createKb = usePostApi(
  "/kb/create",
  CreateKbSchema.request,
  CreateKbSchema.result,
);

export const renameKb = usePostApi(
  "/kb/rename",
  RenameKbSchema.request,
  RenameKbSchema.result,
);
