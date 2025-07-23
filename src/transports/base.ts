import { Transport, TransportConfig, LogEntry, LogLevel } from '../types';

export abstract class BaseTransport implements Transport {
  public readonly name: string;
  public readonly config: TransportConfig;
  protected buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(name: string, config: TransportConfig = {}) {
    this.name = name;
    this.config = {
      level: LogLevel.INFO,
      enabled: true,
      format: 'json',
      bufferSize: 100,
      flushInterval: 5000,
      ...config,
    };

    if (this.config.flushInterval && this.config.flushInterval > 0) {
      this.startFlushTimer();
    }
  }

  protected shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const configLevelIndex = levels.indexOf(this.config.level!);
    const entryLevelIndex = levels.indexOf(level);
    
    return entryLevelIndex >= configLevelIndex;
  }

  protected formatEntry(entry: LogEntry): string {
    if (this.config.format === 'text') {
      return `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}`;
    }
    return JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      context: entry.context,
      tags: entry.tags,
      userId: entry.userId,
      sessionId: entry.sessionId,
      url: entry.url,
      userAgent: entry.userAgent,
      stack: entry.stack,
    });
  }

  protected addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);
    
    if (this.buffer.length >= (this.config.bufferSize || 100)) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  public async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const entries = [...this.buffer];
    this.buffer = [];
    
    try {
      await this.flushEntries(entries);
    } catch (error) {
      console.error(`Failed to flush entries for transport ${this.name}:`, error);
      this.buffer.unshift(...entries);
    }
  }

  public close(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }

  abstract log(entry: LogEntry): Promise<void> | void;
  protected abstract flushEntries(entries: LogEntry[]): Promise<void>;
}