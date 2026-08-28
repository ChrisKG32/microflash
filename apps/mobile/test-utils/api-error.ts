/**
 * Stand-in for the ApiError class that @microflash/api-client exports.
 *
 * Screen tests mock '@/lib/api' wholesale, and jest.mock factories may not
 * reference out-of-scope variables or use TypeScript parameter properties —
 * so the class is declared here and pulled in with require() inside factories.
 */
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
