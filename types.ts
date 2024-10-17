import type { Ref } from "vue";
import { z } from "zod";
import { BLOCK_CONTENT_TYPES } from "./constants";

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
  z.literal(BLOCK_CONTENT_TYPES.TEXT), // type
  z.any(), // prosemirror doc
]);

export const ImageContentSchema = z.tuple([
  z.literal(BLOCK_CONTENT_TYPES.IMAGE), // type
  z.string(), // path
  z.enum(["left", "center"]), // align
  z.string().nullable(), // caption
  z.number().nullable(), // width
]);

export const CodeContentSchema = z.tuple([
  z.literal(BLOCK_CONTENT_TYPES.CODE), // type
  z.string(), // code
  z.string(), // lang
]);

export const MathDisplayContentSchema = z.tuple([
  z.literal(BLOCK_CONTENT_TYPES.MATH), // type
  z.string(), // src
]);

export const QueryContentSchema = z.tuple([
  z.literal(BLOCK_CONTENT_TYPES.QUERY), // type
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
} & (
  | { type: "normalBlock"; docId: string }
  | {
      type: "mirrorBlock";
      src: BlockId;
    }
  | {
      type: "virtualBlock";
      src: BlockId;
      childrenCreated: boolean;
    }
);

export type LoadedBlock = {
  loading: false;
  id: BlockId;
  parentId: BlockId;
  parentRef: Ref<LoadedBlock | null>;
  childrenIds: BlockId[];
  childrenRefs: Ref<LoadedBlock | null>[];
  fold: boolean;
  deleted: boolean;
  content: BlockContent;
  ctext: string;
  metadata: Record<string, any>; // TODO
  mtext: string;
  olinks: BlockId[];
  boosting: number;
  acturalSrc: BlockId;
} & (
  | { type: "normalBlock"; docId: string }
  | {
      type: "mirrorBlock";
      src: BlockId;
    }
  | {
      type: "virtualBlock";
      src: BlockId;
      childrenCreated: boolean;
    }
);

export type LoadedBlockWithLevel = LoadedBlock & { level: number };

export type LoadingNormalBlock = LoadingBlock & { type: "normalBlock" };
export type LoadingMirrorBlock = LoadingBlock & { type: "mirrorBlock" };
export type LoadingVirtualBlock = LoadingBlock & { type: "virtualBlock" };

export type LoadedNormalBlock = LoadedBlock & { type: "normalBlock" };
export type LoadedMirrorBlock = LoadedBlock & { type: "mirrorBlock" };
export type LoadedVirtualBlock = LoadedBlock & { type: "virtualBlock" };

export type ABlock = LoadingBlock | LoadedBlock;
