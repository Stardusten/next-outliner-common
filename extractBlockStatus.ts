import type { BlockStatus } from "./types";

export const extractBlockStatus = (blockStatus: BlockStatus) => {
  const type = blockStatus & 0b11;
  const fold = blockStatus & 0b100;
  return {
    type: type == 0 ? "normalBlock" : type == 1 ? "mirrorBlock" : "virtualBlock",
    fold: fold == 0 ? true : false,
  } as const;
}