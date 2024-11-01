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

export const _RESP_CODES = {
  SUCCESS: 0,
  INVALID_REQUEST: 1,
  PASSWORD_INCORRECT: 2,
  EXCEED_MAX_ATTEMPTS: 3,
  NO_AUTHORIZATION: 4,
  UNKNOWN_ERROR: 5,
  TARGET_NOT_FOUND: 6,
  INVALID_RESPONSE: 7,
  NO_AXIOS: 8,
  FILE_EXISTS: 9,
  DIR_NOT_FOUND: 10,
  TOKEN_EXPIRED: 11,
} as const;

export const RESP_CODES_NAMES: {
  [K in keyof typeof _RESP_CODES as (typeof _RESP_CODES)[K]]: K
} = Object.fromEntries(Object.entries(_RESP_CODES)
  .map(([key, val]) => [val, key])) as any;

export const RESP_CODES = {
  ..._RESP_CODES,
  ...RESP_CODES_NAMES
} as const;