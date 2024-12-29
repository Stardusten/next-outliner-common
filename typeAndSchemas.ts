import { z } from "zod";
import {
  BLOCK_CONTENT_TYPES,
  RESP_CODES_NAMES,
  _RESP_CODES,
} from "./constants";

export const DataDocIdSchema = z.coerce.number();
