import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import * as Y from "yjs";
import { LeveldbPersistence } from "y-leveldb";
import { decoding, encoding } from "lib0";
import * as syncProtocol from "y-protocols/sync";

// 这个实现修改自 https://github.com/yjs/y-websocket/blob/master/bin/utils.cjs
// 主要修改之处在于：
// 1. 使用 TypeScript 重写
// 2. 一个 ws 连接不是只用于同步一个 Y.Doc，而是用于同步一个 location 下的所有 Y.Doc
// 3. location 是这些文档对应的 levelDB 数据库的路径
// 4. Y.Doc 的 name 可以随便取，guid 是 {location}{name}
// 5. 根据 4，我们应该保证所有属于同一 location 的 Y.Doc 的 name 应该唯一
// 6. 根据 4，name 应该和 levelDb 数据库的路径无关，否则数据库一移动就没法用了
// 7. 建立连接时不必指定 docname，而是指定 location
// 8. 每个 location 下必须有一个名为 "baseDoc" 的 Y.Doc，默认会同步这个 doc（和 y-websocket 里指定 docname == "baseDoc" 效果一样）

// 笔记：
// 同步消息分三种：
// 1. syncStep1：记录发送方的状态向量，收到时应该回复以 syncStep2
// 2. syncStep2：用于回复 syncStep1，包含发送方所有不知道的 structs 和完整的删除集 (delete set)
// 3. update：

const WsStates = {
  readyConnecting: 0,
  readyOpen: 1,
  readyClosing: 2,
  readyClosed: 3,
} as const;

const MsgTypes = {
  msgSync: 0,
  msgAwareness: 1,
  msgAuth: 2,
} as const;

const PING_TIMEOUT = 3000;

type WsConnectionOpts = {
  location: string;
  gc: boolean;
};

type LdbController = {
  ldb: LeveldbPersistence;
  bindDoc: (docName: string, doc: Y.Doc) => void;
  whenLoaded: Promise<void>;
};

export const BASE_DOC_NAME = "baseDoc";

// location -> [baseDoc, (docName -> doc)]
export const docs = new Map<string, [Y.Doc, Map<string, Y.Doc>]>();

// location -> leveldbPersistence
const ldbControllers = new Map<string, LdbController>();

// location -> connections to this location
const connsByLocation = new Map<string, Set<WebSocket>>();

// a set of all docs that have sent syncStep1
const sentSyncStep1 = new Set<string>();

const getLdbController = (location: string) => {
  let controller = ldbControllers.get(location);

  if (!controller) {
    const ldb = new LeveldbPersistence(location);

    // loadPromise 在 bindDoc 并且根据数据库的内容更新完 Doc 后 resolve
    let loadPromiseResolver: (() => void) | undefined;
    const loadPromise = new Promise<void>((resolve) => {
      loadPromiseResolver = resolve;
    });

    const controller: LdbController = {
      ldb,
      bindDoc: async (docName: string, doc: Y.Doc) => {
        //////////////// Migration ////////////////
        const allDocNames = await ldb.getAllDocNames();
        if (allDocNames.includes("base")) {
          const baseDoc = await ldb.getYDoc("base");
          await ldb.clearDocument("base");
          await ldb.storeUpdate(BASE_DOC_NAME, Y.encodeStateAsUpdate(baseDoc));
          console.log("Migration done");
          const newBaseDoc = await ldb.getYDoc(BASE_DOC_NAME);
          console.log(
            "newBaseDoc size",
            newBaseDoc.getMap("blockInfoMap").size,
          );
          process.exit(1);
        }
        ///////////////////////////////////////////

        // 从数据库中取得 db，并于互相更新
        const docInDb = await ldb.getYDoc(docName);
        const newUpdates = Y.encodeStateAsUpdate(doc);
        ldb.storeUpdate(docName, newUpdates);
        Y.applyUpdate(doc, Y.encodeStateAsUpdate(docInDb));
        // 绑定监听器，在 doc 更新时持久化到数据库
        doc.on("update", (update) => {
          ldb.storeUpdate(docName, update);
        });
        // 加载完成
        loadPromiseResolver?.();
      },
      whenLoaded: loadPromise,
    };

    ldbControllers.set(location, controller);
    return controller;
  } else return controller;
};

const getBaseDoc = (location: string, gc: boolean = true) => {
  const [baseDoc] = docs.get(location) ?? [];

  if (!baseDoc) {
    const guid = `${location}${BASE_DOC_NAME}`;
    console.debug(`baseDoc ${guid} not found, create one and bind to ldb.`);
    const doc = new Y.Doc({ guid, gc });
    const ldbController = getLdbController(location);
    ldbController.bindDoc(BASE_DOC_NAME, doc);
    docs.set(location, [doc, new Map()]);
    return doc;
  } else return baseDoc;
};

const getOtherDoc = (location: string, docName: string, gc: boolean = true) => {
  const [baseDoc, otherDocs] = docs.get(location) ?? [];
  if (!baseDoc || !otherDocs)
    throw new Error(`Base doc not found for location ${location}`);

  const doc = otherDocs.get(docName);
  if (!doc) {
    const guid = `${location}${docName}`;
    const doc = new Y.Doc({ guid, gc });
    const ldbController = getLdbController(location);
    ldbController.bindDoc(docName, doc);
    otherDocs.set(docName, doc);
    return doc;
  } else return doc;
};

const addConn = (conn: WebSocket, location: string, doc: Y.Doc) => {
  const connsToLocation = connsByLocation.get(location);
  if (!connsToLocation) connsByLocation.set(location, new Set([conn]));
  else connsToLocation.add(conn);
};

const closeConn = (location: string, doc: Y.Doc, conn: WebSocket) => {
  const connsToLocation = connsByLocation.get(location);
  if (connsToLocation && connsToLocation.has(conn)) {
    connsToLocation.delete(conn);
    // TODO remove persistence after all connections to this location are closed
  }

  conn.close();
};

const sendSyncStep1 = (location: string, doc: Y.Doc, conn: WebSocket) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MsgTypes.msgSync);
  encoding.writeVarString(encoder, doc.guid);
  syncProtocol.writeSyncStep1(encoder, doc);
  send(location, doc, conn, encoding.toUint8Array(encoder));
};

const send = (
  location: string,
  doc: Y.Doc,
  conn: WebSocket,
  msg: Uint8Array,
) => {
  if (
    conn.readyState !== WsStates.readyConnecting &&
    conn.readyState !== WsStates.readyOpen
  ) {
    closeConn(location, doc, conn);
  }
  try {
    conn.send(msg, {}, (err) => {
      err != null && closeConn(location, doc, conn);
    });
  } catch (e) {
    closeConn(location, doc, conn);
  }
};

const needSend = (encoder: encoding.Encoder) => {
  if (encoding.length(encoder) <= 1) return false;
  const buf = encoding.toUint8Array(encoder);
  const decoder = decoding.createDecoder(buf);
  decoding.readVarUint(decoder);
  decoding.readVarString(decoder);
  return decoding.hasContent(decoder);
};

const _msgHandler = async (
  conn: WebSocket,
  location: string,
  msg: Uint8Array,
) => {
  try {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(msg);

    // 先读取消息类型
    const msgType = decoding.readVarUint(decoder);
    switch (msgType) {
      case MsgTypes.msgSync: {
        // 如果是同步消息，则接下来是消息所对应 doc 的 guid
        const docGuid = decoding.readVarString(decoder);

        const isBaseDoc = docGuid.endsWith(BASE_DOC_NAME);
        const doc = isBaseDoc
          ? getBaseDoc(location)
          : getOtherDoc(location, docGuid.slice(location.length));

        // 其他 doc 的消息
        if (isBaseDoc) {
          // 如果还没有发送 syncStep1，则发送
          if (!sentSyncStep1.has(docGuid)) {
            console.debug(`send syncStep1 to ${docGuid}`);
            sendSyncStep1(location, doc, conn);
            sentSyncStep1.add(docGuid);
          }
        }

        // 回复收到的消息
        encoding.writeVarUint(encoder, MsgTypes.msgSync);
        encoding.writeVarString(encoder, doc.guid);
        const msgType = syncProtocol.readSyncMessage(
          decoder,
          encoder,
          doc,
          conn,
        );
        console.debug(`recv msgType: ${msgType}, docGuid: ${docGuid}`);

        // 判断是否需要回复，readSyncMessage 算出来是空消息就不用回复了
        if (needSend(encoder)) {
          console.debug(`reply to ${docGuid}`);
          send(location, doc, conn, encoding.toUint8Array(encoder));
        }
        break;
      }
      case MsgTypes.msgAwareness: {
        // TODO
        break;
      }
      case MsgTypes.msgAuth: {
        // TODO
        break;
      }
    }
  } catch (err) {
    console.error("msgHandler error", err);
  }
};

const registerMsgHandler = (conn: WebSocket, location: string) => {
  conn.on("message", (msg) =>
    _msgHandler(conn, location, new Uint8Array(msg as any)),
  );
};

const registerAliveChecker = (
  conn: WebSocket,
  location: string,
  doc: Y.Doc,
) => {
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (connsByLocation.get(location)?.has(conn)) {
        closeConn(location, doc, conn);
      }
      clearInterval(pingInterval);
    } else if (connsByLocation.get(location)?.has(conn)) {
      pongReceived = false;
      try {
        conn.ping();
      } catch (e) {
        closeConn(location, doc, conn);
        clearInterval(pingInterval);
      }
    }
  }, PING_TIMEOUT);
  conn.on("close", () => {
    closeConn(location, doc, conn);
    clearInterval(pingInterval);
  });
  conn.on("pong", () => {
    pongReceived = true;
  });
};

const registerUpdateListener = (location: string, doc: Y.Doc) => {
  doc.on("update", (update) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MsgTypes.msgSync);
    encoding.writeVarString(encoder, doc.guid);
    syncProtocol.writeUpdate(encoder, update);
    const msg = encoding.toUint8Array(encoder);
    const receiverConns = connsByLocation.get(location);
    if (receiverConns) {
      for (const conn of receiverConns) {
        send(location, doc, conn, msg);
      }
    }
  });
};

const setupWsConnection = (
  conn: WebSocket,
  req: IncomingMessage,
  opts: WsConnectionOpts,
) => {
  const { location, gc } = opts;

  console.debug("setupWsConnection", location, gc);
  conn.binaryType = "arraybuffer";
  const baseDoc = getBaseDoc(location, gc);
  addConn(conn, location, baseDoc);
  registerMsgHandler(conn, location);
  registerUpdateListener(location, baseDoc);
  registerAliveChecker(conn, location, baseDoc);
  sendSyncStep1(location, baseDoc, conn);
};

export default setupWsConnection;
