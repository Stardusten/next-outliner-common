import type { Ref } from "vue";
import { z } from "zod";

// first 2 bits:
//   00 - normal block
//   01 - mirror block
//   10 - virtual block
// 3rd bit:
//   0 - folded
//   1 - expanded
export const BlockStatusSchema = z.number().min(0).max(5 /* 101 */);
export const BlockIdSchema = z.string();

export const TextContentSchema = z.tuple([
  z.literal(0), // type
  z.any(), // prosemirror doc
]);

export const ImageContentSchema = z.tuple([
  z.literal(1), // type
  z.string(), // path
  z.enum(["left", "center"]), // align
  z.string().nullable(), // caption
  z.number().nullable(), // width
]);

export const CodeContentSchema = z.tuple([
  z.literal(2), // type
  z.string(), // code
  z.string(), // lang
]);

export const MathDisplayContentSchema = z.tuple([
  z.literal(3), // type
  z.string(), // src
]);

export const QueryContentSchema = z.tuple([
  z.literal(4), // type
  z.any(), // prosemirror doc of title
  z.string(), // query
  z.boolean(), // showResults
  z.boolean(), // showQuery
]);

export const BlockContentSchema = z.union([
  TextContentSchema,
  ImageContentSchema,
  CodeContentSchema,
  MathDisplayContentSchema,
  QueryContentSchema,
]);

export type BlockStatus = z.infer<typeof BlockStatusSchema>;
export type BlockId = string;
export type BlockContent = z.infer<typeof BlockContentSchema>;
export type TextContent = z.infer<typeof TextContentSchema>;
export type ImageContent = z.infer<typeof ImageContentSchema>;
export type CodeContent = z.infer<typeof CodeContentSchema>;
export type MathDisplayContent = z.infer<typeof MathDisplayContentSchema>;
export type QueryContent = z.infer<typeof QueryContentSchema>;

export type LoadingBlock = {
  loading: true;
  id: BlockId;
  parentId: BlockId;
  childrenIds: BlockId[];
  fold: boolean;
  deleted: boolean;
  docId: number;
} & (
  | { type: "normalBlock" }
  | {
      type: "mirrorBlock" | "virtualBlock";
      src: BlockId;
    }
);

export type LoadedBlock = {
  loading: false;
  id: BlockId;
  deleted: boolean;
  parentId: BlockId;
  parentRef: Ref<ABlock | null>;
  childrenIds: BlockId[];
  childrenRefs: Ref<ABlock | null>[];
  fold: boolean;
  content: BlockContent;
  ctext: string;
  metadata: Record<string, any>; // TODO
  mtext: string;
  olinks: BlockId[];
  boosting: number;
  acturalSrc: BlockId;
  docId: number;
} & (
  | { type: "normalBlock" }
  | {
      type: "mirrorBlock" | "virtualBlock";
      src: BlockId;
    }
);

export type LoadingNormalBlock = LoadingBlock & { type: "normalBlock" };
export type LoadingMirrorBlock = LoadingBlock & { type: "mirrorBlock" };
export type LoadingVirtualBlock = LoadingBlock & { type: "virtualBlock" };

export type LoadedNormalBlock = LoadedBlock & { type: "normalBlock" };
export type LoadedMirrorBlock = LoadedBlock & { type: "mirrorBlock" };
export type LoadedVirtualBlock = LoadedBlock & { type: "virtualBlock" };

export type ABlock = LoadingBlock | LoadedBlock;
