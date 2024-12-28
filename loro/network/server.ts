export interface ServerConnection {
  // Check if the connection is open
  isOpen(): boolean;
  // Send a message to all the clients connected to this server
  send(message: Uint8Array): void;
  // Close the connection
  close(): void;
  // Ping the client
  ping?(): void;
  // Register event listeners
  onMessage(handler: (msg: Uint8Array) => void): void;
  onClose(handler: () => void): void;
  onError(handler: (error: any) => void): void;
  onOpen(handler: () => void): void;
  onPong?(handler: () => void): void;
}

export interface ServerNetwork {
  // Register a handler for incoming connections
  onConnection(handler: (conn: ServerConnection) => void): void;
  // Start listening on a specified port
  startServer(host: string, port: number): void;
}
