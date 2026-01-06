/**
 * Centralized error handling utilities
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  RATE_LIMIT = 'RATE_LIMIT',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: unknown;
  retryable: boolean;
  statusCode?: number;
}

// User-friendly error messages
const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.NETWORK]: "Can't connect to the server. Please check your internet connection.",
  [ErrorType.AUTH]: 'Your session has expired. Please sign in again.',
  [ErrorType.RATE_LIMIT]: "You're doing that too fast! Please wait a moment and try again.",
  [ErrorType.VALIDATION]: 'Something went wrong with your request. Please try again.',
  [ErrorType.SERVER]: "Our servers are having trouble. We're working on it!",
  [ErrorType.UNKNOWN]: 'Something unexpected happened. Please try again.',
};

/**
 * Parse an error and return a structured AppError
 */
export function parseError(error: unknown): AppError {
  // Handle fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: ErrorType.NETWORK,
      message: ERROR_MESSAGES[ErrorType.NETWORK],
      originalError: error,
      retryable: true,
    };
  }

  // Handle network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('offline') ||
      message.includes('timeout') ||
      message.includes('failed to fetch')
    ) {
      return {
        type: ErrorType.NETWORK,
        message: ERROR_MESSAGES[ErrorType.NETWORK],
        originalError: error,
        retryable: true,
      };
    }
  }

  // Handle response errors (from fetch responses)
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // Check for status codes
    const statusCode = err.status || err.statusCode;
    if (typeof statusCode === 'number') {
      return parseStatusCodeError(statusCode, error);
    }

    // Supabase errors
    if (err.code || err.message) {
      return parseSupabaseError(err);
    }
  }

  // Default unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: ERROR_MESSAGES[ErrorType.UNKNOWN],
    originalError: error,
    retryable: true,
  };
}

/**
 * Parse HTTP status code errors
 */
function parseStatusCodeError(statusCode: number, originalError: unknown): AppError {
  if (statusCode === 401 || statusCode === 403) {
    return {
      type: ErrorType.AUTH,
      message: ERROR_MESSAGES[ErrorType.AUTH],
      originalError,
      retryable: false,
      statusCode,
    };
  }

  if (statusCode === 429) {
    return {
      type: ErrorType.RATE_LIMIT,
      message: ERROR_MESSAGES[ErrorType.RATE_LIMIT],
      originalError,
      retryable: true,
      statusCode,
    };
  }

  if (statusCode >= 400 && statusCode < 500) {
    return {
      type: ErrorType.VALIDATION,
      message: ERROR_MESSAGES[ErrorType.VALIDATION],
      originalError,
      retryable: false,
      statusCode,
    };
  }

  if (statusCode >= 500) {
    return {
      type: ErrorType.SERVER,
      message: ERROR_MESSAGES[ErrorType.SERVER],
      originalError,
      retryable: true,
      statusCode,
    };
  }

  return {
    type: ErrorType.UNKNOWN,
    message: ERROR_MESSAGES[ErrorType.UNKNOWN],
    originalError,
    retryable: true,
    statusCode,
  };
}

/**
 * Parse Supabase-specific errors
 */
function parseSupabaseError(error: Record<string, unknown>): AppError {
  const code = String(error.code || '');
  const message = String(error.message || '');

  // Auth errors
  if (
    code.includes('auth') ||
    code === 'PGRST301' ||
    message.includes('JWT') ||
    message.includes('token') ||
    message.includes('session') ||
    message.includes('not authenticated')
  ) {
    return {
      type: ErrorType.AUTH,
      message: ERROR_MESSAGES[ErrorType.AUTH],
      originalError: error,
      retryable: false,
    };
  }

  // Rate limiting
  if (code === '429' || message.includes('rate limit') || message.includes('too many')) {
    return {
      type: ErrorType.RATE_LIMIT,
      message: ERROR_MESSAGES[ErrorType.RATE_LIMIT],
      originalError: error,
      retryable: true,
    };
  }

  // Network/connection errors
  if (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('ECONNREFUSED')
  ) {
    return {
      type: ErrorType.NETWORK,
      message: ERROR_MESSAGES[ErrorType.NETWORK],
      originalError: error,
      retryable: true,
    };
  }

  return {
    type: ErrorType.UNKNOWN,
    message: error.message ? String(error.message) : ERROR_MESSAGES[ErrorType.UNKNOWN],
    originalError: error,
    retryable: true,
  };
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  try {
    // Try to fetch a small resource
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Retry an async operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: AppError) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, onRetry } = options;

  let lastError: AppError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = parseError(error);

      // Don't retry non-retryable errors
      if (!lastError.retryable || attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  onError?: (error: AppError) => void
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = parseError(error);
      if (onError) {
        onError(appError);
      }
      throw appError;
    }
  }) as T;
}
