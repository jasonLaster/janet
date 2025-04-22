// Move warning suppression to top of file, before any other code
const originalWarn = console.warn;
console.warn = function (msg: string, ...args: any[]) {
  // List of warnings to suppress
  const suppressedWarnings = [
    'Ran out of space in font private use area',
    // Add any other warnings to suppress here
  ];

  // Check if message contains any of the suppressed warnings
  const shouldSuppress = suppressedWarnings.some(warning =>
    typeof msg === 'string' && msg.includes(warning)
  );

  if (!shouldSuppress) {
    originalWarn(msg, ...args);
  }
};

export function debugLog(message: string, ...args: any[]) {
  if (process.env.DEBUG?.includes('pdf-ocd')) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}

export function errorLog(message: string, error: any) {
  console.error(`[ERROR] ${message}`, {
    message: error.message,
    stack: error.stack,
    details: error.details || 'No additional details',
    cause: error.cause
  });
}

export const debug = debugLog; 