/**
 * @module provider/websocket
 */

/* eslint-env browser */

import * as Y from "yjs"; // eslint-disable-line
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

export const messageSync = 0;
export const messageQueryAwareness = 3;
export const messageAwareness = 1;
export const messageAuth = 2;

// @todo - this should depend on awareness.outdatedTime
const messageReconnectTimeout = 30000;

/**
 *                       encoder,          decoder,          provider,          emitSynced, messageType
 * @type {Array<function(encoding.Encoder, decoding.Decoder, WebsocketProvider, boolean,    number):void>}
 */
const messageHandlers = [];

messageHandlers[messageSync] = (encoder, decoder, provider, emitSynced, _messageType) => {
  const docGuid = decoding.readVarString(decoder);
  const doc = provider.getDoc(docGuid);
  if (!doc) {
    console.error(`doc not found with id: ${docGuid}, all docs: ${[...provider.docs.keys()]}`);
    return;
  }

  encoding.writeVarUint(encoder, messageSync);
  encoding.writeVarString(encoder, docGuid);
  // 在这里设置 origin
  const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, {
    type: "remote",
    changeSources: [provider],
  });

  console.log(`recv messageSync,  docGuid=${docGuid}, type=${syncMessageType}`);

  // 收到 syncStep2 后更新同步状态
  if (emitSynced && syncMessageType === syncProtocol.messageYjsSyncStep2) {
    const oldState = provider.syncedStatus.get(docGuid);
    if (!oldState) {
      provider.syncedStatus.set(docGuid, true);
      doc.emit("synced", [true]);
    }
  }
};

// 暂时不支持 awareness
messageHandlers[messageQueryAwareness] = (
  encoder,
  _decoder,
  provider,
  _emitSynced,
  _messageType,
) => {
  throw new Error("Not support yet");
};

messageHandlers[messageAwareness] = (_encoder, decoder, provider, _emitSynced, _messageType) => {
  throw new Error("Not support yet");
};

messageHandlers[messageAuth] = (_encoder, decoder, provider, _emitSynced, _messageType) => {
  authProtocol.readAuthMessage(decoder, provider.doc, (_ydoc, reason) =>
    permissionDeniedHandler(provider, reason),
  );
};

/**
 * @param {WebsocketProvider} provider
 * @param {string} reason
 */
const permissionDeniedHandler = (provider, reason) =>
  console.warn(`Permission denied to access ${provider.url}.\n${reason}`);

/**
 * @param {WebsocketProvider} provider
 * @param {Uint8Array} buf
 * @param {boolean} emitSynced
 * @return {encoding.Encoder}
 */
const readMessage = (provider, buf, emitSynced) => {
  const decoder = decoding.createDecoder(buf);
  const encoder = encoding.createEncoder();
  const messageType = decoding.readVarUint(decoder);
  const messageHandler = provider.messageHandlers[messageType];
  if (/** @type {any} */ (messageHandler)) {
    messageHandler(encoder, decoder, provider, emitSynced, messageType);
  } else {
    console.error("Unable to compute message");
  }
  return encoder;
};

/**
 *
 * @param {encoding.Encoder} encoder
 */
const needSend = (encoder) => {
  const buf = encoding.toUint8Array(encoder);
  const decoder = decoding.createDecoder(buf);
  decoding.readVarUint(decoder);
  decoding.readVarString(decoder);
  return decoding.hasContent(decoder);
};

/**
 * @param {WebsocketProvider} provider
 */
const setupWS = (provider) => {
  if (provider.shouldConnect && provider.ws === null) {
    const websocket = new provider._WS(provider.url, provider.protocols);
    websocket.binaryType = "arraybuffer";
    provider.ws = websocket;
    provider.wsconnecting = true;
    provider.wsconnected = false;

    websocket.onmessage = (event) => {
      provider.wsLastMessageReceived = time.getUnixTime();
      const encoder = readMessage(provider, new Uint8Array(event.data), true);
      if (encoding.length(encoder) > 1 && needSend(encoder)) {
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
        provider.synced = false;
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

      for (const [k, doc] of provider.docs) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        encoding.writeVarString(encoder, k);
        syncProtocol.writeSyncStep1(encoder, doc);
        websocket.send(encoding.toUint8Array(encoder));
      }

      provider.emit("status", [
        {
          status: "connected",
        },
      ]);
    };
    provider.emit("status", [
      {
        status: "connecting",
      },
    ]);
  }
};

/**
 * @param {WebsocketProvider} provider
 * @param {ArrayBuffer} buf
 */
const broadcastMessage = (provider, buf) => {
  const ws = provider.ws;
  if (provider.wsconnected && ws && ws.readyState === ws.OPEN) {
    ws.send(buf);
  }
};

/**
 * 基于 y-websocket.js 修改，允许多个文档共享同一个 websocket 连接
 * 
 * 注意：
 * 1. 必须指定每个文档的 guid，guid 格式为 `{roomname}{docname}`
 *    roomname 是 roomname，也会被作为文档持久化路径，docname 是文档名称
 * 2. 不支持子文档！不要将文档放到 Map 里成为子文档！
 * 3. 如果要一个文档通过一个 WebsocketProvider 同步，需要手动调用 addDoc 方法将其纳入，并手动调用 connect 方法
 * 
 * @example
   const baseDoc = new Y.Doc({ guid: 'C:\\Users\\xiang\\Desktop\\test-dbbase' });
    const doc1 = new Y.Doc({ guid: 'C:\\Users\\xiang\\Desktop\\test-db1' });
    const doc2 = new Y.Doc({ guid: 'C:\\Users\\xiang\\Desktop\\test-db2' });
    
    const wsProvider = new WebsocketProvider(
      'ws://localhost:8081',
      'C:\\Users\\xiang\\Desktop\\test-db',
      {
        params: {
          docname: 'base',
          location: 'C:\\Users\\xiang\\Desktop\\test-db',
          authorization: 'xxxxxx',
        },
      }
    );
    
    wsProvider.addDoc(baseDoc);
    wsProvider.addDoc(doc1);
    wsProvider.addDoc(doc2);
    wsProvider.connect();

    // 等待所有文档同步完成
    await new Promise(resolve => {
      const handler = setInterval(() => {
        if (wsProvider.synced) {
          clearInterval(handler);
          resolve(true);
        }
      }, 100);
    });

    // 执行操作
    baseDoc.getArray("test").push([1,2,3,4,5]);
    doc1.getArray("test").push([6,7,8,9,10]);
    doc2.getArray("test").push([11,12,13,14,15]);

    wsProvider.disconnect();
    wsProvider.destroy();
 */
export class WebsocketProvider extends Observable {
  /**
   * @param {string} serverUrl
   * @param {string} roomname
   * @param {Y.Doc} doc
   * @param {object} opts
   * @param {boolean} [opts.connect]
   * @param {Object<string,string>} [opts.params] specify url parameters
   * @param {Array<string>} [opts.protocols] specify websocket protocols
   * @param {typeof WebSocket} [opts.WebSocketPolyfill] Optionall provide a WebSocket polyfill
   * @param {number} [opts.resyncInterval] Request server state every `resyncInterval` milliseconds
   * @param {number} [opts.maxBackoffTime] Maximum amount of time to wait before trying to reconnect (we try to reconnect using exponential backoff)
   */
  constructor(
    serverUrl,
    roomname,
    {
      connect = true,
      params = {},
      protocols = [],
      WebSocketPolyfill = WebSocket,
      resyncInterval = -1,
      maxBackoffTime = 2500,
    } = {},
  ) {
    super();
    // ensure that url is always ends with /
    while (serverUrl[serverUrl.length - 1] === "/") {
      serverUrl = serverUrl.slice(0, serverUrl.length - 1);
    }
    this.serverUrl = serverUrl;
    this.maxBackoffTime = maxBackoffTime;
    /**
     * The specified url parameters. This can be safely updated. The changed parameters will be used
     * when a new connection is established.
     * @type {Object<string,string>}
     */
    this.params = params;
    this.protocols = protocols;
    this.roomname = roomname;
    this._WS = WebSocketPolyfill;
    this.wsconnected = false;
    this.wsconnecting = false;
    this.wsUnsuccessfulReconnects = 0;
    this.messageHandlers = messageHandlers.slice();
    /**
     * @type {boolean}
     */
    this._synced = false;
    /**
     * @type {WebSocket?}
     */
    this.ws = null;
    this.wsLastMessageReceived = 0;
    /**
     * Whether to connect to other peers or not
     * @type {boolean}
     */
    this.shouldConnect = connect;
    /**
     * 通过这个 websocket 同步的所有文档
     * @type {Map}
     */
    this.docs = new Map();

    /**
     * 所有文档的更新处理器
     */
    this.updateHandlers = new Map();

    /**
     * 所有文档的同步状态
     */
    this.syncedStatus = new Map();

    /**
     * @type {number}
     */
    this._resyncInterval = 0;
    if (resyncInterval > 0) {
      this._resyncInterval = /** @type {any} */ (
        setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // resend sync step 1
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageSync);
            syncProtocol.writeSyncStep1(encoder, doc);
            this.ws.send(encoding.toUint8Array(encoder));
          }
        }, resyncInterval)
      );
    }

    this._checkInterval = /** @type {any} */ (
      setInterval(() => {
        if (
          this.wsconnected &&
          messageReconnectTimeout < time.getUnixTime() - this.wsLastMessageReceived
        ) {
          // no message received in a long time - not even your own awareness
          // updates (which are updated every 15 seconds)
          /** @type {WebSocket} */ (this.ws).close();
        }
      }, messageReconnectTimeout / 10)
    );
  }

  get url() {
    const encodedParams = url.encodeQueryParams(this.params);
    return (
      this.serverUrl + "/" + this.roomname + (encodedParams.length === 0 ? "" : "?" + encodedParams)
    );
  }

  /**
   * @param {Y.Doc} doc
   */
  addDoc(doc) {
    console.log("addDoc", doc.guid);
    const updateHandler = (update, origin) => {
      if (origin === this) return;
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      encoding.writeVarString(encoder, doc.guid);
      syncProtocol.writeUpdate(encoder, update);
      broadcastMessage(this, encoding.toUint8Array(encoder));
    };

    doc.on("update", updateHandler);
    this.docs.set(doc.guid, doc);
    this.updateHandlers.set(doc.guid, updateHandler);
    this.syncedStatus.set(doc.guid, false);

    // invoke sync step1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    encoding.writeVarString(encoder, doc.guid);
    syncProtocol.writeSyncStep1(encoder, doc);
    broadcastMessage(this, encoding.toUint8Array(encoder));
  }

  /**
   * @param {Y.Doc} doc
   */
  removeDoc(doc) {
    console.log("removeDoc", doc.guid);
    doc.off("update", this.updateHandlers.get(doc.guid));
    this.docs.delete(doc.guid);
    this.updateHandlers.delete(doc.guid);
    this.syncedStatus.delete(doc.guid);
  }

  /**
   * get doc by id (main doc or sub doc)
   * @param {String} id
   * @returns
   */
  getDoc(id) {
    return this.docs.get(id);
  }

  /**
   * @type {boolean}
   */
  get synced() {
    for (const [_, state] of this.syncedStatus) {
      if (!state) return false;
    }
    return true;
  }

  set synced(state) {
    this._synced = state;
  }

  destroy() {
    if (this._resyncInterval !== 0) {
      clearInterval(this._resyncInterval);
    }
    clearInterval(this._checkInterval);
    this.disconnect();
    if (env.isNode && typeof process !== "undefined") {
      process.off("exit", () => {});
    }
    this.doc.off("update", this._updateHandler);
    super.destroy();
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

  /**
   * 检查一个文档是否同步
   * @param {string} id doc guid
   */
  isSynced(id) {
    return !!this.syncedStatus.get(id);
  }
}
