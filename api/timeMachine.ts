import { z } from "zod";
import { createPostApi } from "./utils";

export const GetAllSavePointsSchema = {
  request: z.object({
    location: z.string(),
  }),
  result: z.object({
    savePointInfos: z.array(z.object({
      label: z.string(),
      id: z.string(),
      timestamp: z.coerce.date(),
    })),
  }),
}

export const getAllSavePoints = createPostApi(
  "/get-all-save-points",
  GetAllSavePointsSchema.request,
  GetAllSavePointsSchema.result,
);

export const CreateSavePointSchema = {
  request: z.object({
    label: z.string(),
    location: z.string(),
  }),
  result: z.object({}),
}

export const createSavePoint = createPostApi(
  "/create-save-point",
  CreateSavePointSchema.request,
  CreateSavePointSchema.result,
);

export const DeleteSavePointSchema = {
  request: z.object({
    location: z.string(),
    filename: z.string(),
  }),
  result: z.object({}),
}

export const deleteSavePoint = createPostApi(
  "/delete-save-point",
  DeleteSavePointSchema.request,
  DeleteSavePointSchema.result,
);

export const RenameSavePointSchema = {
  request: z.object({
    location: z.string(),
    filename: z.string(),
    newLabel: z.string(),
  }),
  result: z.object({}),
  }

export const renameSavePoint = createPostApi(
  "/rename-save-point",
  RenameSavePointSchema.request,
  RenameSavePointSchema.result,
);
