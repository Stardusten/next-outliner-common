import { z } from "zod";

export const GetAllKbInfoSchema = {
  request: z.object({}),
  result: z.array(
    z.object({
      name: z.string(),
      location: z.string(),
    }),
  ),
};

export const CreateKbSchema = {
  request: z.object({
    location: z.string(),
    name: z.string(),
    password: z.string(),
  }),
  result: z.object({}),
};

export const RenameKbSchema = {
  request: z.object({
    location: z.string(),
    newName: z.string(),
  }),
  result: z.object({}),
};

export const DeleteKbSchema = {
  request: z.object({
    location: z.string(),
  }),
  result: z.object({}),
};

export const BackupKbSchema = {
  request: z.object({
    location: z.string(),
  }),
  result: z.object({
    backupPath: z.string(),
  }),
};

export const ListAllBackupsSchema = {
  request: z.object({
    location: z.string(),
  }),
  result: z.array(
    z.object({
      name: z.string(),
      size: z.number(),
    }),
  ),
};

export const ShrinkKbSchema = {
  request: z.object({
    location: z.string(),
  }),
  result: z.object({
    beforeSize: z.number(),
    afterSize: z.number(),
  }),
};
