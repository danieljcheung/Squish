import { useCallback } from 'react';
import { router } from 'expo-router';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { parseError, AppError, ErrorType } from '@/lib/errors';

interface ErrorHandlerOptions {
  showToast?: boolean;
  onRetry?: () => void;
  onAuthError?: () => void;
}

export function useErrorHandler() {
  const { showError, showToast } = useToast();
  const { signOut } = useAuth();

  /**
   * Handle an error with appropriate user feedback
   */
  const handleError = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}) => {
      const { showToast: shouldShowToast = true, onRetry, onAuthError } = options;

      const appError = error instanceof Object && 'type' in error
        ? (error as AppError)
        : parseError(error);

      console.error('Error handled:', appError);

      // Handle auth errors
      if (appError.type === ErrorType.AUTH) {
        if (onAuthError) {
          onAuthError();
        } else {
          // Sign out and redirect to login
          signOut().then(() => {
            router.replace('/(auth)/login');
          });
        }

        if (shouldShowToast) {
          showError(appError);
        }
        return appError;
      }

      // Handle rate limit errors with special messaging
      if (appError.type === ErrorType.RATE_LIMIT) {
        if (shouldShowToast) {
          showToast({
            type: 'warning',
            message: appError.message,
            duration: 5000,
          });
        }
        return appError;
      }

      // Handle other errors
      if (shouldShowToast) {
        showError(appError, appError.retryable ? onRetry : undefined);
      }

      return appError;
    },
    [showError, showToast, signOut]
  );

  /**
   * Wrap an async function with error handling
   */
  const wrapAsync = useCallback(
    <T>(
      asyncFn: () => Promise<T>,
      options: ErrorHandlerOptions = {}
    ): Promise<T | null> => {
      return asyncFn().catch((error) => {
        handleError(error, options);
        return null;
      });
    },
    [handleError]
  );

  /**
   * Create a safe version of an async function
   */
  const createSafeAsync = useCallback(
    <TArgs extends unknown[], TResult>(
      asyncFn: (...args: TArgs) => Promise<TResult>,
      options: ErrorHandlerOptions = {}
    ) => {
      return async (...args: TArgs): Promise<TResult | null> => {
        try {
          return await asyncFn(...args);
        } catch (error) {
          handleError(error, options);
          return null;
        }
      };
    },
    [handleError]
  );

  return {
    handleError,
    wrapAsync,
    createSafeAsync,
  };
}
