/**
 * Binds React Query's AbortSignal onto the current synchronous axios call.
 *
 * queryFn typically calls apiApp.get() before the first await. The request
 * interceptor reads this signal then; restoring immediately after that sync
 * stretch keeps parallel queries from stealing each other's signal.
 *
 * Do not wrap mutations — a submit should finish even if the page unmounts.
 */

let currentQueryAbortSignal: AbortSignal | undefined;

export const peekQueryAbortSignal = (): AbortSignal | undefined => currentQueryAbortSignal;

export const runWithQueryAbortSignal = <T>(signal: AbortSignal | undefined, fn: () => T): T => {
    const previous = currentQueryAbortSignal;
    currentQueryAbortSignal = signal;
    try {
        return fn();
    } finally {
        currentQueryAbortSignal = previous;
    }
};
