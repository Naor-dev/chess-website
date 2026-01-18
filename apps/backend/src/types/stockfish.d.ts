/**
 * Type declarations for the stockfish npm package
 * The package provides a WASM-based Stockfish chess engine
 */
declare module 'stockfish' {
  interface StockfishInstance {
    postMessage(message: string): void;
    addMessageListener(callback: (message: string) => void): void;
    removeMessageListener(callback: (message: string) => void): void;
  }

  function stockfish(): StockfishInstance;
  export = stockfish;
}
