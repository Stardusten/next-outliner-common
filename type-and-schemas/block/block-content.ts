import { z } from "zod";
import { BLOCK_CONTENT_TYPES } from "../../constants";

/////////////// Schemas ///////////////

export const TextContentSchema = z.tuple([
  z.literal(BLOCK_CONTENT_TYPES.TEXT), // type
  z.any(), // prosemirror doc
]);

export const ImageFilterSchema = z.enum([
  "blend",
  "circle",
  "invert",
  "invertW",
  "outline",
  "blendLuminosity",
]);

export const ImageContentSchema = z.tuple([
  z.literal(BLOCK_CONTENT_TYPES.IMAGE), // type
  z.string(), // path
  z.enum(["left", "center"]), // align
  z.string().nullable(), // caption
  z.number().nullable(), // width
  z.array(ImageFilterSchema).nullable(), // filters
]);

export const CarouselContentSchema = z.tuple([
  z.literal(BLOCK_CONTENT_TYPES.CAROUSEL), // type
  z.array(z.string()), // paths
  z.string().nullable(), // caption
  z.number().nullable(), // width
  z.array(ImageFilterSchema).nullable(), // filters
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

export const AudioContentSchema = z.tuple([
  z.literal(BLOCK_CONTENT_TYPES.AUDIO), // type
  z.string(), // src
]);

export const VideoContentSchema = z.tuple([
  z.literal(BLOCK_CONTENT_TYPES.VIDEO), // type
  z.string(), // src
  z.number().nullable(), // width
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
  CarouselContentSchema,
  AudioContentSchema,
  VideoContentSchema,
]);

/////////////// Types ///////////////

export type TextContent = z.infer<typeof TextContentSchema>;
export type ImageContent = z.infer<typeof ImageContentSchema>;
export type CodeContent = z.infer<typeof CodeContentSchema>;
export type MathDisplayContent = z.infer<typeof MathDisplayContentSchema>;
export type QueryContent = z.infer<typeof QueryContentSchema>;
export type CarouselContent = z.infer<typeof CarouselContentSchema>;
export type AudioContent = z.infer<typeof AudioContentSchema>;
export type VideoContent = z.infer<typeof VideoContentSchema>;
export type BlockContent = z.infer<typeof BlockContentSchema>;
