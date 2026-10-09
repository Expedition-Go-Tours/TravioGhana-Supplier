import { describe, it, expect } from 'vitest';
import { getErrorType, getErrorMessage, ErrorType } from '../errorHandler';

describe('errorHandler', () => {
  describe('getErrorType', () => {
    it('classifies an aborted request (ECONNABORTED) as a timeout', () => {
      const error = { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' };
      expect(getErrorType(error)).toBe(ErrorType.TIMEOUT);
    });

    it('classifies a response-less error as a network error', () => {
      expect(getErrorType({ message: 'Network Error' })).toBe(ErrorType.NETWORK);
    });

    it('classifies by HTTP status', () => {
      expect(getErrorType({ response: { status: 401 } })).toBe(ErrorType.AUTH);
      expect(getErrorType({ response: { status: 403 } })).toBe(ErrorType.FORBIDDEN);
      expect(getErrorType({ response: { status: 404 } })).toBe(ErrorType.NOT_FOUND);
      expect(getErrorType({ response: { status: 503 } })).toBe(ErrorType.SERVER);
    });
  });

  describe('getErrorMessage', () => {
    it('never surfaces axios raw timeout text — uses the friendly copy', () => {
      const error = { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' };
      expect(getErrorMessage(error)).toBe('Request timed out. Please try again.');
    });

    it('prefers a server-provided message when present', () => {
      const error = { response: { status: 500, data: { message: 'Database paused' } } };
      expect(getErrorMessage(error)).toBe('Database paused');
    });

    it('falls back to the mapped default for unknown statuses', () => {
      const error = { response: { status: 418 } };
      expect(getErrorMessage(error)).toBe('An unexpected error occurred.');
    });
  });
});