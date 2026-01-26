/**
 * Simple mutex for serializing async operations.
 * Used to prevent concurrent access to engine instances.
 */
export class Mutex {
  private locked = false;
  private queue: Array<() => void> = [];

  /**
   * Acquires the mutex lock.
   * If the mutex is already locked, waits until it becomes available.
   *
   * @returns A release function that must be called when done
   */
  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }

    // Wait in queue for lock to be released
    return new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        resolve(() => this.release());
      });
    });
  }

  /**
   * Releases the mutex lock.
   * If there are waiting tasks, passes lock to the next one.
   */
  private release(): void {
    const next = this.queue.shift();
    if (next) {
      // Pass lock to next in queue
      next();
    } else {
      this.locked = false;
    }
  }

  /**
   * Checks if the mutex is currently locked.
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Returns the number of tasks waiting for the lock.
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}
