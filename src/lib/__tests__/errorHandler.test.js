import { describe, it, expect } from 'vitest';
import {
  getErrorType,
  getErrorMessage,
  describeActionError,
  PERMISSION_MESSAGE,
  ErrorType,
} from '../errorHandler';

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

    it('renders a 403 as the one permission sentence, not the old generic copy', () => {
      expect(getErrorMessage({ response: { status: 403 } })).toBe(PERMISSION_MESSAGE);
    });
  });

  describe('describeActionError', () => {
    it('tells the member it is a permission refusal and who fixes it', () => {
      const error = { response: { status: 403, data: { message: 'You do not have permission for this action' } } };

      expect(describeActionError(error)).toBe(PERMISSION_MESSAGE);
      expect(PERMISSION_MESSAGE).toContain("You don't have permission to perform this action.");
      expect(PERMISSION_MESSAGE).toContain('Ask the business owner to update your role.');
    });

    it('keeps a refusal that is about membership, not role', () => {
      // "Supplier access required" is a different problem: telling the member
      // to ask for a role change would send them to the wrong fix.
      const error = { response: { status: 403, data: { message: 'Supplier access required' } } };

      expect(describeActionError(error)).toBe(
        'Supplier access required. Ask the business owner to update your role.',
      );
    });

    it('keeps the action in the sentence when one is given', () => {
      const error = { response: { status: 403 } };

      expect(describeActionError(error, "Couldn't update pickup")).toBe(
        `Couldn't update pickup — ${PERMISSION_MESSAGE}`,
      );
    });

    it('leaves every other failure exactly as it was', () => {
      expect(describeActionError({ response: { status: 500, data: { message: 'Database paused' } } })).toBe(
        'Database paused',
      );
      expect(describeActionError({ code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' })).toBe(
        'Request timed out. Please try again.',
      );
    });
  });
});