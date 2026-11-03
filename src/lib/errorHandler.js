import { toast } from 'sonner';
import config from '@/config';

/**
 * Error Types
 */
export const ErrorType = {
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  AUTH: 'AUTH_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  SERVER: 'SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  FORBIDDEN: 'FORBIDDEN_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

/**
 * The one refusal a role can produce, in one wording.
 *
 * A member who clicks something their role cannot do must be told that plainly
 * — never "Failed to save", which reads as a broken feature — and told who
 * fixes it. The backend answers the same sentence from every guard
 * (`code: PERMISSION_DENIED`), so this stays in step with it.
 */
export const PERMISSION_ACTION = "You don't have permission to perform this action.";
export const PERMISSION_HINT = 'Ask the business owner to update your role.';
export const PERMISSION_MESSAGE = `${PERMISSION_ACTION} ${PERMISSION_HINT}`;

// Refusals that already ARE the sentence above, rewritten so the hint always
// lands. Anything else — "Supplier access required" — is a membership problem,
// not a role one, and sending the member to the owner to fix a role for that
// sends them to the wrong place.
const GENERIC_REFUSALS = new Set([
  PERMISSION_ACTION,
  'You do not have permission to perform this action',
  'You do not have permission for this action',
  "You don't have permission to access this resource.",
]);

function refusalMessage(error) {
  const server = (error.response?.data?.message || '').trim();
  if (!server) return PERMISSION_ACTION;
  if (GENERIC_REFUSALS.has(server)) return PERMISSION_ACTION;
  // The backend writes refusals without terminal punctuation; the toast is a
  // sentence, so close it before the hint joins on.
  return /[.!?]$/.test(server) ? server : `${server}.`;
}

/**
 * What to show when a user-initiated action fails. Pass the fallback the call
 * site already used ("Couldn't update pickup") so:
 *   - a refusal keeps its context AND says what happened and who fixes it:
 *     "Couldn't update pickup — You don't have permission to perform this
 *      action. Ask the business owner to update your role.";
 *   - anything else behaves exactly as it did before (the server's own message
 *     when it sent one, otherwise the fallback) — never axios's raw text.
 */
export function describeActionError(error, fallback = '') {
  if (getErrorType(error) !== ErrorType.FORBIDDEN) {
    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      fallback ||
      getErrorMessage(error)
    );
  }
  const sentence = `${refusalMessage(error)} ${PERMISSION_HINT}`;
  return fallback ? `${fallback} — ${sentence}` : sentence;
}

/**
 * Error Messages Map
 */
const errorMessages = {
  [ErrorType.NETWORK]: 'Network error. Please check your internet connection.',
  [ErrorType.TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorType.AUTH]: 'Authentication failed. Please log in again.',
  [ErrorType.VALIDATION]: 'Validation error. Please check your input.',
  [ErrorType.SERVER]: 'Server error. Please try again later.',
  [ErrorType.NOT_FOUND]: 'Resource not found.',
  [ErrorType.FORBIDDEN]: PERMISSION_MESSAGE,
  [ErrorType.UNKNOWN]: 'An unexpected error occurred.',
};

/**
 * Determine error type from axios error
 */
export function getErrorType(error) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return ErrorType.TIMEOUT;
    }
    return ErrorType.NETWORK;
  }

  const status = error.response.status;

  if (status === 401) return ErrorType.AUTH;
  if (status === 400 || status === 422) return ErrorType.VALIDATION;
  if (status === 403) return ErrorType.FORBIDDEN;
  if (status === 404) return ErrorType.NOT_FOUND;
  if (status >= 500) return ErrorType.SERVER;

  return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error) {
  const errorType = getErrorType(error);

  // Timeout errors carry no response body, so error.message is axios's raw
  // developer text ("timeout of 30000ms exceeded"). That must never reach a
  // user toast — always use the friendly mapped copy instead.
  if (errorType === ErrorType.TIMEOUT) {
    return errorMessages[ErrorType.TIMEOUT];
  }

  // A refusal always lands on the one sentence plus who fixes it, whatever the
  // guard happened to call it. (describeActionError does not call back here for
  // this branch, so there is no recursion.)
  if (errorType === ErrorType.FORBIDDEN) {
    return describeActionError(error);
  }

  // Try to get message from response
  const responseMessage = 
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message;

  // Return custom message or default
  return responseMessage || errorMessages[errorType];
}

// Error toasts must never stack: an outage (paused DB, gateway 5xx, dropped
// connection) fails every background refetch, and each failure would otherwise
// pop its own toast. Same-message toasts are suppressed within the window, so
// the user sees one notice per problem, not a wall of identical ones.
const ERROR_TOAST_DEDUPE_MS = 20000;
let lastErrorToast = { message: null, at: 0 };

function shouldShowErrorToast(message) {
  const now = Date.now();
  if (lastErrorToast.message === message && now - lastErrorToast.at < ERROR_TOAST_DEDUPE_MS) {
    return false;
  }
  lastErrorToast = { message, at: now };
  return true;
}

/**
 * Handle API Error
 * Shows toast notification and logs error
 */
export function handleApiError(error, customMessage) {
  const errorType = getErrorType(error);
  const message = customMessage || getErrorMessage(error);

  // Log error in development
  if (config.isDevelopment()) {
    console.error('API Error:', {
      type: errorType,
      message,
      error,
      response: error.response,
    });
  }

  // Show toast notification (skip for network errors, dedupe the rest so an
  // outage never floods the screen with identical toasts)
  if (errorType !== ErrorType.NETWORK && shouldShowErrorToast(message)) {
    toast.error(message, {
      duration: 5000,
    });
  }

  // Log to monitoring service
  logError(error, { type: errorType, message });

  return {
    type: errorType,
    message,
    originalError: error,
  };
}

/**
 * Log error to monitoring service
 */
export function logError(error, context = {}) {
  if (config.monitoring.sentryDSN) {
    // TODO: Integrate with Sentry or other monitoring service
    // Example: Sentry.captureException(error, { extra: context });
    console.log('📊 Logging error to monitoring service:', error.message, context);
  }
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      const errorType = getErrorType(error);
      if ([ErrorType.AUTH, ErrorType.FORBIDDEN, ErrorType.VALIDATION].includes(errorType)) {
        throw error;
      }

      // Don't retry if this was the last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      
      if (config.isDevelopment()) {
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error) {
  const errorType = getErrorType(error);
  return [ErrorType.NETWORK, ErrorType.TIMEOUT, ErrorType.SERVER].includes(errorType);
}

/**
 * Format validation errors
 */
export function formatValidationErrors(errors) {
  if (Array.isArray(errors)) {
    return errors.map(err => err.message || err).join(', ');
  }

  if (typeof errors === 'object') {
    return Object.entries(errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join(', ');
  }

  return String(errors);
}

/**
 * Global error handler for unhandled promise rejections
 */
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    logError(event.reason, { type: 'unhandledRejection' });
    
    // Prevent default browser behavior
    event.preventDefault();
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    logError(event.error, { type: 'globalError' });
  });
}

export default {
  ErrorType,
  getErrorType,
  getErrorMessage,
  handleApiError,
  logError,
  retryWithBackoff,
  isRetryableError,
  formatValidationErrors,
  setupGlobalErrorHandlers,
};
