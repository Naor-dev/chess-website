import type { PlayStyleStrategy, EngineConfig, EngineMove } from '../types';

/**
 * DefaultPlayStyle - Standard chess play without modifications
 *
 * This is the base play style that passes through engine config unchanged.
 * Serves as a template for future play style implementations.
 */
export class DefaultPlayStyle implements PlayStyleStrategy {
  readonly name = 'default';

  /**
   * No modifications to engine config - use standard settings
   */
  modifyConfig(config: EngineConfig): EngineConfig {
    return config;
  }

  /**
   * No opening book - always let engine calculate
   */
  async getOpeningMove(_fen: string, _history: string[]): Promise<EngineMove | null> {
    return null;
  }
}
