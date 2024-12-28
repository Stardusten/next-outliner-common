import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { Decoder } from "lib0/decoding";
import { LoroDoc } from "loro-crdt";

// canSync: docId (varString), doc (snapshot, varUint8Array)
// startSync: docId (varString), vv (versionVector of server, varUint8Array), updates (varUint8Array)
// postConflict: docId (varString), doc (snapshot, varUint8Array)
// postUpdate: docId (varString), updates (updates, varUint8Array)

export const MessageTypes = {
  canSync: 0,
  startSync: 1,
  postConflict: 2,
  postUpdate: 3,
} as const;

export type ParsedMessageType<T extends keyof typeof MessageTypes> = ReturnType<
  typeof readMessage
> & { type: (typeof MessageTypes)[T] };

export const writeCanSyncMessage = (docId: string, doc: LoroDoc) => {
  const snapshot = doc.export({ mode: "snapshot" });
  const encoder = encoding.createEncoder();
  encoding.writeUint8(encoder, MessageTypes.canSync);
  encoding.writeVarString(encoder, docId);
  encoding.writeVarUint8Array(encoder, snapshot);
  return encoding.toUint8Array(encoder);
};

const readCanSyncMessage = (decoder: Decoder) => {
  const docId = decoding.readVarString(decoder);
  const snapshot = decoding.readVarUint8Array(decoder);
  return { type: MessageTypes.canSync, docId, snapshot } as const;
};

export const writeStartSyncMessage = (
  docId: string,
  updates: Uint8Array,
  vv: Uint8Array,
) => {
  const encoder = encoding.createEncoder();
  encoding.writeUint8(encoder, MessageTypes.startSync);
  encoding.writeVarString(encoder, docId);
  encoding.writeVarUint8Array(encoder, vv);
  encoding.writeVarUint8Array(encoder, updates);
  return encoding.toUint8Array(encoder);
};

const readStartSyncMessage = (decoder: Decoder) => {
  const docId = decoding.readVarString(decoder);
  const vv = decoding.readVarUint8Array(decoder);
  const updates = decoding.readVarUint8Array(decoder);
  return { type: MessageTypes.startSync, docId, vv, updates } as const;
};

export const writePostConflictMessage = (
  docId: string,
  snapshot: Uint8Array,
) => {
  const encoder = encoding.createEncoder();
  encoding.writeUint8(encoder, MessageTypes.postConflict);
  encoding.writeVarString(encoder, docId);
  encoding.writeVarUint8Array(encoder, snapshot);
  return encoding.toUint8Array(encoder);
};

const readPostConflictMessage = (decoder: Decoder) => {
  const docId = decoding.readVarString(decoder);
  const snapshot = decoding.readVarUint8Array(decoder);
  return { type: MessageTypes.postConflict, docId, snapshot } as const;
};

export const writePostUpdateMessage = (docId: string, updates: Uint8Array) => {
  const encoder = encoding.createEncoder();
  encoding.writeUint8(encoder, MessageTypes.postUpdate);
  encoding.writeVarString(encoder, docId);
  encoding.writeVarUint8Array(encoder, updates);
  return encoding.toUint8Array(encoder);
};

const readPostUpdateMessage = (decoder: Decoder) => {
  const docId = decoding.readVarString(decoder);
  const updates = decoding.readVarUint8Array(decoder);
  return { type: MessageTypes.postUpdate, docId, updates } as const;
};

const messageHandlers = {
  [MessageTypes.canSync]: readCanSyncMessage,
  [MessageTypes.startSync]: readStartSyncMessage,
  [MessageTypes.postConflict]: readPostConflictMessage,
  [MessageTypes.postUpdate]: readPostUpdateMessage,
} as const;

export const readMessage = (msg: Uint8Array) => {
  const decoder = decoding.createDecoder(msg);
  const msgType = decoding.readUint8(decoder);
  const messageHandler =
    messageHandlers[msgType as keyof typeof messageHandlers];
  if (!messageHandler) {
    throw new Error(`Unknown message type: ${msgType}`);
  }
  return messageHandler(decoder);
};
