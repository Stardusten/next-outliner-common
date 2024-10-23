import { z } from "zod";

export const BLOCK_CONTENT_TYPES = {
  TEXT: 0,
  IMAGE: 1,
  CODE: 2,
  MATH: 3,
  QUERY: 4,
} as const;

export const BLOCK_TYPE_ZH_NAMES = [
  "文本",
  "图片",
  "代码",
  "公式",
  "查询",
];

export const RESP_CODES = {
  SUCCESS: 0,
  INVALID_REQUEST: 1,
  PASSWORD_INCORRECT: 2,
  EXCEED_MAX_ATTEMPTS: 3,
  NO_AUTHORIZATION: 4,
  UNKNOWN_ERROR: 5,
} as const;