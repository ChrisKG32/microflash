// Jest setup file
// Import type declarations to augment Express Request
import '../types/express';

// Mock ESM-only p-all module for Jest compatibility
// This mock preserves order by executing tasks sequentially
jest.mock('p-all', () => {
  return {
    __esModule: true,
    default: async <T>(
      tasks: Array<() => Promise<T>>,
      _options?: { concurrency?: number },
    ): Promise<T[]> => {
      // Execute tasks sequentially to preserve order in tests
      const results: T[] = [];
      for (const task of tasks) {
        const result = await task();
        results.push(result);
      }
      return results;
    },
  };
});
