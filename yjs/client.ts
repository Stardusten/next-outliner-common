import * as Y from "yjs";
import * as bc from "lib0/broadcastchannel";
import * as time from "lib0/time";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import * as authProtocol from "y-protocols/auth";
import * as awarenessProtocol from "y-protocols/awareness";
import { Observable } from "lib0/observable";
import * as math from "lib0/math";
import * as url from "lib0/url";
import * as env from "lib0/environment";
import WebSocket from "ws";

export const messageSync = 0;
export const messageQueryAwareness = 3;
export const messageAwareness = 1;
export const messageAuth = 2;

export const BASE_DOC_NAME = "baseDoc";

type MsgHandler = (
  encoder: encoding.Encoder,
  decoder: decoding.Decoder,
  provider: WebsocketProvider,
  messageType: number,
) => void;

export type SyncStatus = "synced" | "disconnected" | "connected" | "connecting";

const needSend = (encoder: encoding.Encoder) => {
  if (encoding.length(encoder) <= 1) return false;
  const buf = encoding.toUint8Array(encoder);
  const decoder = decoding.createDecoder(buf);
  decoding.readVarUint(decoder);
  decoding.readVarString(decoder);
  return decoding.hasContent(decoder);
};

const msgSyncHandler: MsgHandler = (encoder, decoder, provider, _messageType) => {
  // 先读取 docGuid
  const docGuid = decoding.readVarString(decoder);
  const doc =
    provider.baseDoc.guid === docGuid ? provider.baseDoc : provider.otherDocs.get(docGuid);
  if (!doc) {
    console.error("doc not found, docGuid:", docGuid);
    return;
  }

  encoding.writeVarUint(encoder, messageSync);
  encoding.writeVarString(encoder, docGuid);
  const msgType = syncProtocol.readSyncMessage(decoder, encoder, doc, provider);

  console.debug(`recv msgType: ${msgType}, docGuid: ${docGuid}`);

  if (msgType === syncProtocol.messageYjsSyncStep2) {
    provider.syncedDocs.add(docGuid);
    provider.emit("status", [{ status: "synced", docGuid }]);
  }
};

const msgQueryAwarenessHandler: MsgHandler = (encoder, _decoder, provider, _messageType) => {
  // TODO
  throw new Error("Not implemented");
};

const msgAwarenessHandler: MsgHandler = (_encoder, decoder, provider, _messageType) => {
  // TODO
  throw new Error("Not implemented");
};

const msgAuthHandler: MsgHandler = (_encoder, decoder, provider, _messageType) => {
  // TODO
  throw new Error("Not implemented");
};

const msgHandlers = [
  msgSyncHandler,
  msgQueryAwarenessHandler,
  msgAwarenessHandler,
  msgAuthHandler,
] as const;

// @todo - this should depend on awareness.outdatedTime
const messageReconnectTimeout = 30000;

const readMessage = (provider: WebsocketProvider, buf: Uint8Array) => {
  const decoder = decoding.createDecoder(buf);
  const encoder = encoding.createEncoder();
  const msgType = decoding.readVarUint(decoder);
  const msgHandler = provider.msgHandlers[msgType];
  if (msgHandler) {
    msgHandler(encoder, decoder, provider, msgType);
  } else {
    console.error("Unable to compute message");
  }
  return encoder;
};

const setupWS = (provider: WebsocketProvider) => {
  if (provider.shouldConnect && provider.ws === null) {
    const websocket = new provider._WS(provider.url, provider.protocols);
    websocket.binaryType = "arraybuffer";
    provider.ws = websocket;
    provider.wsconnecting = true;
    provider.wsconnected = false;
    provider.syncedDocs.clear();

    websocket.onmessage = (event) => {
      provider.wsLastMessageReceived = time.getUnixTime();
      const encoder = readMessage(provider, new Uint8Array(event.data as any));
      if (needSend(encoder)) {
        websocket.send(encoding.toUint8Array(encoder));
      }
    };
    websocket.onerror = (event) => {
      provider.emit("connection-error", [event, provider]);
    };
    websocket.onclose = (event) => {
      provider.emit("connection-close", [event, provider]);
      provider.ws = null;
      provider.wsconnecting = false;
      if (provider.wsconnected) {
        provider.wsconnected = false;
        provider.syncedDocs.clear();
        provider.emit("status", [{ status: "disconnected" }]);
      } else {
        provider.wsUnsuccessfulReconnects++;
      }
      // Start with no reconnect timeout and increase timeout by
      // using exponential backoff starting with 100ms
      setTimeout(
        setupWS,
        math.min(math.pow(2, provider.wsUnsuccessfulReconnects) * 100, provider.maxBackoffTime),
        provider,
      );
    };
    websocket.onopen = () => {
      provider.wsLastMessageReceived = time.getUnixTime();
      provider.wsconnecting = false;
      provider.wsconnected = true;
      provider.wsUnsuccessfulReconnects = 0;
      provider.emit("status", [{ status: "connected" }]);
      provider.addDoc(provider.baseDoc);
    };
    websocket.onclose = (e) => {
      console.log("websocket onclose", e.code, e.reason);
    };
    provider.emit("status", [{ status: "connecting" }]);
  }
};

const broadcastMessage = (provider: WebsocketProvider, buf: Uint8Array) => {
  const ws = provider.ws!;
  if (provider.wsconnected && ws && ws.readyState === ws.OPEN) {
    ws.send(buf);
  }
};

export class WebsocketProvider extends Observable<string> {
  serverUrl: string;
  maxBackoffTime: number;
  params: Record<string, string>;
  protocols: string[];
  roomname: string;
  baseDoc: Y.Doc;
  otherDocs: Map<string, Y.Doc>; // docGuid -> doc
  _WS: typeof WebSocket;
  wsconnected: boolean;
  wsconnecting: boolean;
  wsUnsuccessfulReconnects: number;
  msgHandlers: MsgHandler[];
  ws: WebSocket | null;
  wsLastMessageReceived: number;
  shouldConnect: boolean;
  _resyncInterval: number | NodeJS.Timeout;
  _exitHandler: () => void;
  _checkInterval: number | NodeJS.Timeout;
  syncedDocs: Set<string>; // docGuids of all synced docs

  constructor(
    serverUrl: string,
    roomname: string,
    baseDoc: Y.Doc,
    {
      connect = true,
      params = {},
      protocols = [],
      WebSocketPolyfill = WebSocket,
      resyncInterval = -1,
      maxBackoffTime = 2500,
    } = {},
  ) {
    if (!baseDoc.guid.endsWith(BASE_DOC_NAME)) {
      throw new Error(`baseDoc.guid must end with ${BASE_DOC_NAME}`);
    }

    super();
    // ensure that url is always ends with /
    while (serverUrl[serverUrl.length - 1] === "/") {
      serverUrl = serverUrl.slice(0, serverUrl.length - 1);
    }
    this.serverUrl = serverUrl;
    this.maxBackoffTime = maxBackoffTime;
    this.params = params;
    this.protocols = protocols;
    this.roomname = roomname;
    this.baseDoc = baseDoc;
    this.otherDocs = new Map();
    this._WS = WebSocketPolyfill;
    this.wsconnected = false;
    this.wsconnecting = false;
    this.wsUnsuccessfulReconnects = 0;
    this.msgHandlers = msgHandlers.slice();
    this.ws = null;
    this.wsLastMessageReceived = 0;
    this.shouldConnect = connect;
    this.syncedDocs = new Set();

    this._resyncInterval = 0;
    if (resyncInterval > 0) {
      this._resyncInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          // resend sync step 1
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageSync);
          encoding.writeVarString(encoder, this.baseDoc.guid);
          syncProtocol.writeSyncStep1(encoder, this.baseDoc);
          const msg = encoding.toUint8Array(encoder);
          this.ws.send(msg);
        }
      }, resyncInterval);
    }

    this._exitHandler = () => {};

    if (env.isNode && typeof process !== "undefined") {
      process.on("exit", this._exitHandler);
    }

    this._checkInterval = setInterval(() => {
      if (
        this.wsconnected &&
        messageReconnectTimeout < time.getUnixTime() - this.wsLastMessageReceived
      ) {
        // no message received in a long time - not even your own awareness
        // updates (which are updated every 15 seconds)
        this.ws?.close();
      }
    }, messageReconnectTimeout / 10);

    if (connect) {
      this.connect();
    }
  }

  get url() {
    const encodedParams = url.encodeQueryParams(this.params);
    return (
      this.serverUrl + "/" + this.roomname + (encodedParams.length === 0 ? "" : "?" + encodedParams)
    );
  }

  isSynced(docGuid: string) {
    return this.syncedDocs.has(docGuid);
  }

  destroy() {
    if (this._resyncInterval !== 0) {
      clearInterval(this._resyncInterval);
    }
    clearInterval(this._checkInterval);
    this.disconnect();
    if (env.isNode && typeof process !== "undefined") {
      process.off("exit", this._exitHandler);
    }
    super.destroy();
  }

  addDoc(doc: Y.Doc) {
    if (doc !== this.baseDoc && this.otherDocs.has(doc.guid)) return;

    // 注册更新监测器
    const updateHandler = (update: any, origin: any) => {
      // XXX
      if (origin === this) return;
      // 发送 syncUpdate
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      encoding.writeVarString(encoder, doc.guid);
      syncProtocol.writeUpdate(encoder, update);
      broadcastMessage(this, encoding.toUint8Array(encoder));
    };
    doc.on("update", updateHandler);
    this.otherDocs.set(doc.guid, doc);

    // 发送 syncStep1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    encoding.writeVarString(encoder, doc.guid);
    syncProtocol.writeSyncStep1(encoder, doc);
    console.log("send syncStep1, docGuid: ", doc.guid);
    broadcastMessage(this, encoding.toUint8Array(encoder));
  }

  disconnect() {
    this.shouldConnect = false;
    if (this.ws !== null) {
      this.ws.close();
    }
  }

  connect() {
    this.shouldConnect = true;
    if (!this.wsconnected && this.ws === null) {
      setupWS(this);
    }
  }
}
