import { z } from "zod";
import { usePostApi } from "./utils";

export const GetAllSavePointsSchema = {
  request: z.object({}),
  result: z.object({
    savePointInfos: z.array(z.object({
      label: z.string(),
      id: z.string(),
      timestamp: z.coerce.date(),
    })),
  }),
}

export const getAllSavePoints = usePostApi(
  "/get-all-save-points",
  GetAllSavePointsSchema.request,
  GetAllSavePointsSchema.result,
);

export const CreateSavePointSchema = {
  request: z.object({
    label: z.string(),
  }),
  result: z.object({}),
}

export const createSavePoint = usePostApi(
  "/create-save-point",
  CreateSavePointSchema.request,
  CreateSavePointSchema.result,
);

export const DeleteSavePointSchema = {
  request: z.object({
    filename: z.string(),
  }),
  result: z.object({}),
}

export const deleteSavePoint = usePostApi(
  "/delete-save-point",
  DeleteSavePointSchema.request,
  DeleteSavePointSchema.result,
);

export const RenameSavePointSchema = {
  request: z.object({
    filename: z.string(),
    newLabel: z.string(),
  }),
  result: z.object({}),
  }

export const renameSavePoint = usePostApi(
  "/rename-save-point",
  RenameSavePointSchema.request,
  RenameSavePointSchema.result,
);
