import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import { LeveldbPersistence } from "y-leveldb";

import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as map from "lib0/map";

import debounce from "lodash.debounce";

import { callbackHandler, isCallbackSet } from "./callback";

const CALLBACK_DEBOUNCE_WAIT = parseInt(
  process.env.CALLBACK_DEBOUNCE_WAIT || "2000",
);
const CALLBACK_DEBOUNCE_MAXWAIT = parseInt(
  process.env.CALLBACK_DEBOUNCE_MAXWAIT || "10000",
);

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;
const wsReadyStateClosing = 2; // eslint-disable-line
const wsReadyStateClosed = 3; // eslint-disable-line

// 说明：这个文件是 yjs 的 websocket 同步的后端实现，在一个 “宣称” 支持子文档的实现的
// 基础上修改得到（实际不能用）。这个实现也不支持子文档，但支持多文档，即通过一个 websocket 连接
// 可以同步多个文档，需要配合前端实现配合使用。

// disable gc when using snapshots!
const gcEnabled = process.env.GC !== "false" && process.env.GC !== "0";

/**
 * relationship of main doc & sub docs
 * @type {Map<String, Map<String, WSSharedDoc>>} mainDocID, subDocID
 */
const subdocsMap = new Map();

/**
 * @type {Map<string, Persistence>} location => Persistence
 */
const persistenceMap = new Map();

/**
 * @type {Map<string, Promise<void>>} doc guid => Promise<void>
 */
const loadPromiseMap = new Map();

// 我们假设同一个 persistence 下，所有 doc 的 docname 是唯一的
// 但是不同 persistence 下的 docname 可以相同
// 因此我们全局使用 `{ldbLocation}{docname}` 作为 guid 来唯一标识一个 doc
// 但 persistence 中的 key 是 docname，和 location 无关
// 这样的好处时，persistence 移动时，不需要修改 docname
const getPersistence = (ldbLocation) => {
  let persistence = persistenceMap.get(ldbLocation);

  if (!persistence) {
    const ldb = new LeveldbPersistence(ldbLocation);
    console.log(`create new persistence, location=${ldbLocation}`);
    persistence = {
      ldb,
      bindState: async (docName, ydoc) => {
        // 记录 load 的 promise，当 load 完成后，调用 resolve
        let loadPromiseResolve;
        const loadPromise = new Promise((resolve, reject) => {
          loadPromiseResolve = resolve;
        });
        loadPromiseMap.set(ldbLocation + docName, loadPromise);

        console.log(`bindState. docName=${docName}, ydoc.guid=${ydoc.guid}`);
        const persistedYdoc = await ldb.getYDoc(docName);
        const newUpdates = Y.encodeStateAsUpdate(ydoc);
        ldb.storeUpdate(docName, newUpdates);
        Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc));
        ydoc.on("update", (update) => {
          console.log(`store update. docName=${docName}`);
          ldb.storeUpdate(docName, update);
        });

        loadPromiseResolve();
      },
      writeState: async (_docName, _ydoc) => {},
    };
    persistenceMap.set(ldbLocation, persistence);
  }

  return persistence;
};

/**
 * @type {Map<string, WSSharedDoc>} guid => WSSharedDoc
 */
export const docs = new Map();

const messageSync = 0;
const messageAwareness = 1;
// const messageAuth = 2

/**
 * @param {Uint8Array} update
 * @param {any} _origin
 * @param {WSSharedDoc} doc
 * @param {any} _tr
 */
const updateHandler = (update, _origin, doc, _tr) => {
  console.log(
    `detect update on ${doc.guid}, send messageUpdate to ${doc.conns.size} conns`,
  );
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  encoding.writeVarString(encoder, doc.guid);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);
  doc.conns.forEach((_, conn) => send(doc, conn, message));
};

export class WSSharedDoc extends Y.Doc {
  /**
   * @param {string} guid
   * @param {string} location
   */
  constructor(guid, location) {
    super({ gc: gcEnabled, guid });
    this.location = location;
    /**
     * Maps from conn to set of controlled user ids. Delete all user ids from awareness when this conn is closed
     * @type {Map<Object, Set<number>>}
     */
    this.conns = new Map();
    /**
     * @type {awarenessProtocol.Awareness}
     */
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    this._registerListeners();
  }

  _registerListeners() {
    /**
     * @param {{ added: Array<number>, updated: Array<number>, removed: Array<number> }} changes
     * @param {Object | null} conn Origin is the connection that made the change
     */
    const awarenessChangeHandler = ({ added, updated, removed }, conn) => {
      const changedClients = added.concat(updated, removed);
      if (conn !== null) {
        const connControlledIDs = /** @type {Set<number>} */ (
          this.conns.get(conn)
        );
        if (connControlledIDs !== undefined) {
          added.forEach((clientID) => {
            connControlledIDs.add(clientID);
          });
          removed.forEach((clientID) => {
            connControlledIDs.delete(clientID);
          });
        }
      }
      // broadcast awareness update
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
      );
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => {
        send(this, c, buff);
      });
    };
    this.awareness.on("update", awarenessChangeHandler);
    this.on("update", updateHandler);
    if (isCallbackSet) {
      this.on(
        "update",
        /** @type {any} */ (
          debounce(callbackHandler, CALLBACK_DEBOUNCE_WAIT, {
            maxWait: CALLBACK_DEBOUNCE_MAXWAIT,
          })
        ),
      );
    }
  }
}

/**
 * Gets a Y.Doc by name, whether in memory or on disk
 *
 * @param {string} docname
 * @param {string} ldbLocation use `{ldbLocation}{docname}` as guid to uniquely identify the doc
 * @param {boolean} gc - whether to allow gc on the doc (applies only when created)
 * @return {WSSharedDoc}
 */
export const getYDoc = (docname, ldbLocation, gc = true) =>
  map.setIfUndefined(docs, ldbLocation + docname, () => {
    console.log("getYDoc", docname, ldbLocation);
    const guid = ldbLocation + docname;
    let doc = docs.get(guid);
    if (doc) return doc;
    console.log("create new doc", guid);
    doc = new WSSharedDoc(guid, ldbLocation);
    doc.gc = gc;
    doc._registerListeners();
    const persistence = getPersistence(ldbLocation);
    if (persistence !== null) {
      persistence.bindState(docname, doc);
    }
    docs.set(guid, doc);
    return doc;
  });

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
 * @param {any} conn
 * @param {WSSharedDoc} doc
 * @param {Uint8Array} message
 */
const messageListener = async (conn, doc, ldbLocation, message) => {
  try {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);
    switch (messageType) {
      case messageSync:
        let targetDoc = doc;
        const docGuid = decoding.readVarString(decoder);
        console.log(`recv messageSync docGuid="${docGuid}"`);

        if (docGuid !== doc.guid) {
          // subdoc XXX
          targetDoc = getYDoc(
            docGuid.slice(ldbLocation.length),
            ldbLocation,
            false,
          );

          // 等待 load 完成后才开始处理消息
          const loadPromise = loadPromiseMap.get(docGuid);
          console.log(`loadPromise=${loadPromise}`);
          if (loadPromise) {
            await loadPromise;
          }

          if (!targetDoc.conns.has(conn)) targetDoc.conns.set(conn, new Set());

          /**@type {Map<String, Boolean>}*/ const subm = subdocsMap.get(
            doc.guid,
          );
          if (subm && subm.has(targetDoc.guid)) {
            // sync step 1 done before.
          } else {
            if (subm) {
              subm.set(targetDoc.guid, targetDoc);
            } else {
              const nm = new Map();
              nm.set(targetDoc.guid, targetDoc);
              subdocsMap.set(doc.guid, nm);
            }

            // send sync step 1
            console.log(`send sync step 1 to subdoc ${targetDoc.guid}`);
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageSync);
            encoding.writeVarString(encoder, targetDoc.guid);
            syncProtocol.writeSyncStep1(encoder, targetDoc);
            send(targetDoc, conn, encoding.toUint8Array(encoder));
          }
        }
        encoding.writeVarUint(encoder, messageSync);
        encoding.writeVarString(encoder, targetDoc.guid);
        syncProtocol.readSyncMessage(decoder, encoder, targetDoc, conn);

        // If the `encoder` only contains the type of reply message and no
        // message, there is no need to send the message. When `encoder` only
        // contains the type of reply, its length is 1.
        if (encoding.length(encoder) > 1 && needSend(encoder)) {
          send(targetDoc, conn, encoding.toUint8Array(encoder));
        }
        break;
      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn,
        );
        break;
      }
    }
  } catch (err) {
    console.error(err);
    // @ts-ignore
    doc.emit("error", [err]);
  }
};

/**
 * @param {WSSharedDoc} doc
 * @param {any} conn
 */
const closeConn = (doc, conn) => {
  console.log(`closeConn. doc.guid=${doc.guid}, conn=${conn}`);
  if (doc.conns.has(conn)) {
    // clear sub docs
    const m = subdocsMap.get(doc.guid);
    if (m && m.size > 0) {
      for (const subdoc of m.values()) {
        subdoc.conns.delete(conn);
        if (subdoc.conns.size === 0) {
          const persistence = getPersistence(doc.location);
          if (persistence !== null) {
            persistence.writeState(subdoc.guid, doc).then(() => {
              subdoc.destroy();
            });
          } else subdoc.destroy();
          docs.delete(subdoc.guid);
        }
      }
    }

    /**
     * @type {Set<number>}
     */
    // @ts-ignore
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      Array.from(controlledIds),
      null,
    );
    if (doc.conns.size === 0) {
      const persistence = getPersistence(doc.location);
      if (persistence !== null) {
        // if persisted, we store state and destroy ydocument
        persistence.writeState(doc.guid, doc).then(() => {
          doc.destroy();
        });
      } else doc.destroy();
      docs.delete(doc.guid);
      subdocsMap.delete(doc.guid);
    }
  }
  conn.close();
};

/**
 * @param {WSSharedDoc} doc
 * @param {import('ws').WebSocket} conn
 * @param {Uint8Array} m
 */
const send = (doc, conn, m) => {
  if (
    conn.readyState !== wsReadyStateConnecting &&
    conn.readyState !== wsReadyStateOpen
  ) {
    closeConn(doc, conn);
  }
  try {
    conn.send(m, {}, (err) => {
      err != null && closeConn(doc, conn);
    });
  } catch (e) {
    closeConn(doc, conn);
  }
};

const pingTimeout = 30000;

/**
 * @param {import('ws').WebSocket} conn
 * @param {import('http').IncomingMessage} req
 * @param {any} opts
 */
export const setupWSConnection = (
  conn,
  req,
  // TODO remove docname
  { docname, location, gc = true } = {},
) => {
  conn.binaryType = "arraybuffer";
  // get doc, initialize if it does not exist yet
  const doc = getYDoc(docname, location, gc);
  doc.conns.set(conn, new Set());
  // listen and reply to events
  conn.on(
    "message",
    /** @param {ArrayBuffer} message */ (message) =>
      messageListener(conn, doc, location, new Uint8Array(message)),
  );

  // Check if connection is still alive
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (doc.conns.has(conn)) {
        closeConn(doc, conn);
      }
      clearInterval(pingInterval);
    } else if (doc.conns.has(conn)) {
      pongReceived = false;
      try {
        conn.ping();
      } catch (e) {
        closeConn(doc, conn);
        clearInterval(pingInterval);
      }
    }
  }, pingTimeout);
  conn.on("close", () => {
    closeConn(doc, conn);
    clearInterval(pingInterval);
  });
  conn.on("pong", () => {
    pongReceived = true;
  });
  // put the following in a variables in a block so the interval handlers don't keep in in
  // scope
  {
    // send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    console.log("send sync step 1", doc.guid);
    encoding.writeVarString(encoder, doc.guid);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(doc, conn, encoding.toUint8Array(encoder));
    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          doc.awareness,
          Array.from(awarenessStates.keys()),
        ),
      );
      send(doc, conn, encoding.toUint8Array(encoder));
    }
  }
};
