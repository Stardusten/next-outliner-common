import type { MinimalBlock } from "@/context/blocks/view-layer/blocksManager";
import type { BlockStatus } from "../type-and-schemas/block/block-status";

export const extractBlockStatus = (blockStatus: BlockStatus) => {
  const type = blockStatus & 0b11;
  const fold = blockStatus & 0b100;
  return {
    type: type == 0 ? "normalBlock" : type == 1 ? "mirrorBlock" : "virtualBlock",
    fold: fold == 0 ? false : true,
  } as const;
};

export const calcBlockStatus = (
  type: "normalBlock" | "mirrorBlock" | "virtualBlock",
  fold: boolean,
) => {
  return (type == "normalBlock" ? 0 : type == "mirrorBlock" ? 1 : 2) | (fold ? 0b100 : 0);
};
