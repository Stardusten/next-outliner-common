import { nanoid } from "nanoid";

export const generateImageName = (name: string, ext: string) => {
  return `${name}__${nanoid()}.${ext}`;
};

export const parseImageName = (name: string) => {
  const ext = name.split(".").pop();
  if (!ext) return null;
  const [originalName, nanoid] = name.split("__");
  if (!originalName || !nanoid) return null;
  return { originalName, nanoid, ext };
};
