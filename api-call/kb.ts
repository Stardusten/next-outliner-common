import { z } from "zod";
import {
  BackupKbSchema,
  CreateKbSchema,
  GetAllKbInfoSchema,
  RenameKbSchema,
} from "../type-and-schemas/api/kb";
import { usePostApi } from "../helper-functions/usePostApi";
import { DeleteKbSchema } from "../type-and-schemas/api/kb";

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

export const deleteKb = usePostApi(
  "/kb/delete",
  DeleteKbSchema.request,
  DeleteKbSchema.result,
);

export const backupKb = usePostApi(
  "/kb/backup",
  BackupKbSchema.request,
  BackupKbSchema.result,
);
