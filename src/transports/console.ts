import { BaseTransport } from './base';
import { LogEntry, LogLevel, TransportConfig } from '../types';

export class ConsoleTransport extends BaseTransport {
  constructor(config: TransportConfig = {}) {
    super('console', config);
  }

  public log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formattedMessage = this.formatEntry(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, entry.context || '');
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, entry.context || '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, entry.context || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage, entry.context || '', entry.error || '');
        if (entry.stack) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  protected async flushEntries(entries: LogEntry[]): Promise<void> {
    entries.forEach(entry => this.log(entry));
  }
}