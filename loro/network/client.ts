export interface ClientConnection {
  // Send a message to the server
  send(message: Uint8Array): void;
  // Close the connection
  close(): void;
  // Ping the server
  pong?(): void;
  // Methods for registering event listeners
  onMessage(handler: (msg: Uint8Array) => void): void;
  onClose(handler: () => void): void;
  onError(handler: (error: any) => void): void;
  onOpen(handler: () => void): void;
  onPing?(handler: () => void): void;
}

export interface ClientNetwork {
  // Establish a new connection to the server
  connect(url: string, protocol?: string): ClientConnection;
}
