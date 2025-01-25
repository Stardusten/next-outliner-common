import { z } from "zod";
import {
  BackupKbSchema,
  CreateKbSchema,
  GetAllKbInfoSchema,
  ListAllBackupsSchema,
  RenameKbSchema,
  ShrinkKbSchema,
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
  "/kb/backup/create",
  BackupKbSchema.request,
  BackupKbSchema.result,
);

export const listAllBackups = usePostApi(
  "/kb/backup/listAll",
  ListAllBackupsSchema.request,
  ListAllBackupsSchema.result,
);

export const shrinkKb = usePostApi(
  "/kb/shrink",
  ShrinkKbSchema.request,
  ShrinkKbSchema.result,
);
