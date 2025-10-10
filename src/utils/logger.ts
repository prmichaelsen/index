export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  // No-op logger to avoid interfering with stdio MCP transport
  // All logging methods do nothing to prevent JSON corruption

  error(message: string, ...args: any[]): void {
    // No-op
  }

  warn(message: string, ...args: any[]): void {
    // No-op
  }

  info(message: string, ...args: any[]): void {
    // No-op
  }

  debug(message: string, ...args: any[]): void {
    // No-op
  }
}

export const logger = new Logger();