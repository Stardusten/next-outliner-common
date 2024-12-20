import { z } from "zod";
import {
  BLOCK_CONTENT_TYPES,
  RESP_CODES_NAMES,
  _RESP_CODES,
} from "./constants";

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
  z
    .array(
      z.enum([
        "blend",
        "circle",
        "invert",
        "invertW",
        "outline",
        "blendLuminosity",
      ]),
    )
    .nullish(), // filters
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

export const RespSchema = (dataSchema: z.ZodType) => {
  return z.discriminatedUnion("success", [
    z.object({ success: z.literal(true), data: dataSchema }),
    z.object({
      success: z.literal(false),
      code: z.number(),
      msg: z.string().optional(),
    }),
  ]);
};

export type Resp<DATA> =
  | { success: true; data: DATA }
  | { success: false; code: keyof typeof RESP_CODES_NAMES; msg?: string };

export const ConfigSchema = z.object({
  host: z.string().default("0.0.0.0"),
  port: z.number().default(8081),
  jwtSecret: z.string(),
  logger: z.boolean().default(true),
  maxParamLength: z.number().default(500),
  knowledgeBases: z.string().array().min(1),
  newKnowledgeBasePathPrefix: z.string(),
  adminPasswordHash: z.string(),
  adminSalt: z.string(),
});

export type Config = z.infer<typeof ConfigSchema>;

export const KnowledgeBaseInfoSchema = z.object({
  name: z.string(),
  passwordHash: z.string(),
  salt: z.string(),
});

export type KnowledgeBaseInfo = z.infer<typeof KnowledgeBaseInfoSchema>;

export const JwtPayloadSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("admin"),
    serverUrl: z.string(),
  }),
  z.object({
    role: z.literal("kb-editor"),
    serverUrl: z.string(),
    location: z.string(),
  }),
]);

export const RoleTypeSchema = z.enum(["admin", "kb-editor", "visitor"]);

export type RoleType = z.infer<typeof RoleTypeSchema>;
