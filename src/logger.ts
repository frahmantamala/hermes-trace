import { LogLevel, LogEntry, Transport, HermesTraceConfig } from './types';
import { DataMasker } from './utils/masking';

export class HermesTrace {
  private transports: Transport[] = [];
  private config: Required<HermesTraceConfig>;
  private sessionId: string;
  private dataMasker: DataMasker;

  constructor(config: HermesTraceConfig = {}) {
    this.config = {
      level: LogLevel.INFO,
      transports: [],
      context: {},
      captureUserAgent: true,
      captureUrl: true,
      captureStackTrace: true,
      maxBufferSize: 1000,
      autoFlush: true,
      flushInterval: 5000,
      masking: { enabled: true },
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.transports = [...this.config.transports];
    this.dataMasker = new DataMasker(this.config.masking);

    if (this.config.autoFlush && typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.config.flushInterval);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
      window.addEventListener('unload', () => this.flush());
    }
  }

  public addTransport(transport: Transport): void {
    this.transports.push(transport);
  }

  public removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name);
  }

  public setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  public setContext(context: Record<string, any>): void {
    this.config.context = { ...this.config.context, ...context };
  }

  public debug(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.DEBUG, message, context, tags);
  }

  public info(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.INFO, message, context, tags);
  }

  public warn(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.WARN, message, context, tags);
  }

  public error(message: string, error?: Error, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.ERROR, message, context, tags, error);
  }

  public fatal(message: string, error?: Error, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.FATAL, message, context, tags, error);
  }

  public async flush(): Promise<void> {
    await Promise.all(
      this.transports.map(async transport => {
        if (transport.flush) {
          try {
            await transport.flush();
          } catch (error) {
            console.error(`Failed to flush transport ${transport.name}:`, error);
          }
        }
      })
    );
  }

  public async close(): Promise<void> {
    await this.flush();
    await Promise.all(
      this.transports.map(async transport => {
        if (transport.close) {
          try {
            await transport.close();
          } catch (error) {
            console.error(`Failed to close transport ${transport.name}:`, error);
          }
        }
      })
    );
  }

  public createChild(context: Record<string, any>): HermesTrace {
    return new HermesTrace({
      ...this.config,
      context: { ...this.config.context, ...context },
      transports: [...this.transports],
    });
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    tags?: string[],
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return;

    const rawEntry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: { ...this.config.context, ...context },
      error,
      tags,
      sessionId: this.sessionId,
      ...(this.config.captureUrl && this.getCurrentUrl()),
      ...(this.config.captureUserAgent && this.getUserAgent()),
      ...(this.config.captureStackTrace && error && { stack: error.stack }),
    };

    const entry = this.applyMasking(rawEntry);

    if (!entry.stack && this.config.captureStackTrace && level >= LogLevel.WARN) {
      entry.stack = this.captureStackTrace();
    }

    this.transports.forEach(transport => {
      try {
        transport.log(entry);
      } catch (transportError) {
        console.error(`Transport ${transport.name} failed:`, transportError);
      }
    });
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const configLevelIndex = levels.indexOf(this.config.level);
    const entryLevelIndex = levels.indexOf(level);
    return entryLevelIndex >= configLevelIndex;
  }

  private getCurrentUrl(): { url?: string } {
    if (typeof window !== 'undefined' && window.location) {
      return { url: window.location.href };
    }
    return {};
  }

  private getUserAgent(): { userAgent?: string } {
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      return { userAgent: navigator.userAgent };
    }
    return {};
  }

  private captureStackTrace(): string {
    try {
      throw new Error();
    } catch (e) {
      const stack = (e as Error).stack;
      if (stack) {
        const lines = stack.split('\n');
        return lines.slice(3).join('\n');
      }
    }
    return '';
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  private applyMasking(entry: LogEntry): LogEntry {
    if (!this.config.masking?.enabled) return entry;

    const maskedEntry = { ...entry };

    if (maskedEntry.message) {
      maskedEntry.message = this.dataMasker.maskData(maskedEntry.message);
    }

    if (maskedEntry.context) {
      maskedEntry.context = this.dataMasker.maskData(maskedEntry.context);
    }

    if (maskedEntry.error && maskedEntry.error.message) {
      maskedEntry.error = {
        ...maskedEntry.error,
        message: this.dataMasker.maskData(maskedEntry.error.message)
      };
    }

    return maskedEntry;
  }

  public addSensitiveField(field: string): void {
    this.dataMasker.addSensitiveField(field);
  }

  public addMaskingRule(rule: import('./types').MaskingRule): void {
    this.dataMasker.addMaskingRule(rule);
  }

  public setCustomMasker(masker: (key: string, value: any) => any): void {
    this.dataMasker.setCustomMasker(masker);
  }

  public getMaskingConfig(): import('./types').MaskingConfig {
    return this.dataMasker.getMaskingConfig();
  }
}

export const createLogger = (config?: HermesTraceConfig): HermesTrace => {
  return new HermesTrace(config);
};