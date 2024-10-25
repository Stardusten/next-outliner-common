import { z } from "zod";
import { BLOCK_CONTENT_TYPES, RESP_CODES } from "./constants";

// first 2 bits:
//   00 - normal block
//   01 - mirror block
//   10 - virtual block
// 3rd bit:
//   0 - folded
//   1 - expanded
export const BlockStatusSchema = z.number().min(0).max(5 /* 101 */);
export const BlockIdSchema = z.string();
export const DataDocIdSchema = z.coerce.number();

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

export const BlockInfoSchema = z.tuple([
  // status 用一个整数记录这个块的类型和折叠状态
  BlockStatusSchema,
  // parent id
  BlockIdSchema,
  // children ids
  z.array(BlockIdSchema),
  // 这个 block 的数据所在的数据 doc 的名字
  // 如果是镜像块或虚拟块，这个值为 null
  z.number().nullable(),
  // 如果是普通块，这个值为 null
  // 如果是镜像块或虚拟块，指向源块的 id
  BlockIdSchema.nullable(),
]);

export const BlockDataSchema = z.tuple([
  // content (only for normal blocks)
  BlockContentSchema.nullable(),
  // metadata
  z.record(z.any()),
]);

export const SavePointSchema_v2 = z.object({
  schema: z.literal("v2"),
  blockInfos: z.record(BlockIdSchema, BlockInfoSchema),
  blockDataDocs: z.record(
    DataDocIdSchema,
    z.record(BlockIdSchema, BlockDataSchema),
  ),
  label: z.string(),
  createdAt: z.coerce.date(),
});

export const SavePointSchema = z.discriminatedUnion("schema", [
  SavePointSchema_v2,
]);

export type BlockStatus = z.infer<typeof BlockStatusSchema>;
export type BlockId = string;
export type BlockContent = z.infer<typeof BlockContentSchema>;
export type TextContent = z.infer<typeof TextContentSchema>;
export type ImageContent = z.infer<typeof ImageContentSchema>;
export type CodeContent = z.infer<typeof CodeContentSchema>;
export type MathDisplayContent = z.infer<typeof MathDisplayContentSchema>;
export type QueryContent = z.infer<typeof QueryContentSchema>;
export type BlockInfo = z.infer<typeof BlockInfoSchema>;
export type BlockData = z.infer<typeof BlockDataSchema>;
export type SavePoint = z.infer<typeof SavePointSchema>;

type NonZero<T extends number> = T extends 0 ? never : number extends T ? never : T;
type Zero<T extends number> = T extends 0 ? number extends T ? never : T : never;

export type Resp<DATA> = {
  code: Zero<number>;
  data: DATA;
} | {
  code: NonZero<number>;
  msg: string;
};

export const NormalizedDatabaseSchema = z.object({
  name: z.string(),
  location: z.string(),
  attachmentsDir: z.string(),
  imagesDir: z.string(),
  musicDir: z.string(),
  videoDir: z.string(),
  documentDir: z.string(),
});

export const DatabaseSchema = NormalizedDatabaseSchema.pick({
  name: true,
  location: true,
}).merge(NormalizedDatabaseSchema.partial());

export const NormalizedConfigSchema = z.object({
  host: z.string(),
  port: z.number(),
  password: z.string(),
  jwtSecret: z.string(),
  logger: z.boolean(),
  maxParamLength: z.number(),
  databases: DatabaseSchema.array(),
});

const ConfigSchema = NormalizedConfigSchema.partial();

export type Config = z.infer<typeof ConfigSchema>;