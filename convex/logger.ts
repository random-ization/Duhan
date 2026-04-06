/**
 * Centralized logging utility for Convex backend
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class Logger {
  private module: string | undefined;

  constructor(module?: string) {
    this.module = module;
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]${this.module ? ` [${this.module}]` : ''}`;
    
    if (context) {
      return `${prefix} ${message} ${JSON.stringify(context)}`;
    }
    
    return `${prefix} ${message}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'DEBUG') {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.log(this.formatMessage('INFO', message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.formatMessage('WARN', message, context));
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const errorContext = error ? { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context 
    } : context;
    
    console.error(this.formatMessage('ERROR', message, errorContext));
  }

  // Structured logging for specific use cases
  ai(message: string, context?: Record<string, unknown>): void {
    this.info(`[AI] ${message}`, context);
  }

  auth(message: string, context?: Record<string, unknown>): void {
    this.info(`[AUTH] ${message}`, context);
  }

  db(message: string, context?: Record<string, unknown>): void {
    this.debug(`[DB] ${message}`, context);
  }

  api(message: string, context?: Record<string, unknown>): void {
    this.info(`[API] ${message}`, context);
  }

  performance(message: string, duration?: number, context?: Record<string, unknown>): void {
    const perfContext = duration ? { duration: `${duration}ms`, ...context } : context;
    this.info(`[PERF] ${message}`, perfContext);
  }
}

// Create module-specific loggers
export const createLogger = (module: string): Logger => new Logger(module);

// Default logger
export const logger = new Logger();

// Common loggers for different modules
export const aiLogger = new Logger('AI');
export const authLogger = new Logger('AUTH');
export const dbLogger = new Logger('DB');
export const apiLogger = new Logger('API');
export const vocabLogger = new Logger('VOCAB');
export const grammarLogger = new Logger('GRAMMAR');
export const topikLogger = new Logger('TOPIK');
export const podcastLogger = new Logger('PODCAST');
export const ttsLogger = new Logger('TTS');
export const paymentLogger = new Logger('PAYMENT');
export const adminLogger = new Logger('ADMIN');

// Export convenience functions for backward compatibility
export const logDebug = (message: string, context?: Record<string, unknown>) => 
  logger.debug(message, context);

export const logInfo = (message: string, context?: Record<string, unknown>) => 
  logger.info(message, context);

export const logWarn = (message: string, context?: Record<string, unknown>) => 
  logger.warn(message, context);

export const logError = (message: string, error?: unknown, context?: Record<string, unknown>) => 
  logger.error(message, error, context);

// Legacy function name for compatibility
export const logAI = (message: string, context?: Record<string, unknown>) => 
  aiLogger.info(message, context);
