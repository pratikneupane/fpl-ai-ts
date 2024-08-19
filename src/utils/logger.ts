/**
 * A simple logging utility with `info` and `error` methods.
 *
 * The `info` method logs an informational message to the console.
 * The `error` method logs an error message to the console.
 *
 * Both methods accept a message string and any number of additional arguments,
 * which will be logged along with the message.
 */
export const logger = {
    info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  };