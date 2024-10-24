import { z } from "zod";

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

export const CreateSavePointSchema = {
  request: z.object({
    label: z.string(),
    location: z.string(),
  }),
  result: z.object({}),
}

export const DeleteSavePointSchema = {
  request: z.object({
    location: z.string(),
    filename: z.string(),
  }),
  result: z.object({}),
}

export const RenameSavePointSchema = {
  request: z.object({
    location: z.string(),
    filename: z.string(),
    newLabel: z.string(),
  }),
  result: z.object({}),
}
