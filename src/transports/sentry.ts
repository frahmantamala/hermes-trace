import { BaseTransport } from './base';
import { LogEntry, SentryConfig, LogLevel } from '../types';

export class SentryTransport extends BaseTransport {
  private sentry: any = null;
  private readonly dsn?: string;
  private readonly environment?: string;
  private readonly release?: string;
  private readonly sampleRate: number;

  constructor(config: SentryConfig) {
    super('sentry', config);
    this.dsn = config.dsn;
    this.environment = config.environment;
    this.release = config.release;
    this.sampleRate = config.sampleRate || 1.0;
    
    this.initializeSentry();
  }

  private async initializeSentry(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        // Dynamic import with error handling for optional dependency
        const sentryModule = await import('@sentry/browser').catch(() => null);
        if (!sentryModule) {
          console.warn('Sentry transport configured but @sentry/browser not installed');
          return;
        }
        
        const { init, captureException, captureMessage, withScope, setTag, setContext } = sentryModule;
        this.sentry = { init, captureException, captureMessage, withScope, setTag, setContext };
        
        if (this.dsn) {
          init({
            dsn: this.dsn,
            environment: this.environment,
            release: this.release,
            sampleRate: this.sampleRate,
            beforeSend: (event: any) => {
              if (Math.random() > this.sampleRate) {
                return null;
              }
              return event;
            },
          });
        }
      }
    } catch (error) {
      console.warn('Sentry not available:', error);
    }
  }

  public log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level) || !this.sentry) return;
    
    this.sentry.withScope((scope: any) => {
      if (entry.tags) {
        entry.tags.forEach(tag => scope.setTag('custom_tag', tag));
      }
      
      if (entry.userId) {
        scope.setUser({ id: entry.userId });
      }
      
      if (entry.context) {
        scope.setContext('additional_context', entry.context);
      }
      
      if (entry.url) {
        scope.setTag('url', entry.url);
      }
      
      if (entry.sessionId) {
        scope.setTag('session_id', entry.sessionId);
      }
      
      scope.setLevel(this.mapLogLevelToSentryLevel(entry.level));
      
      if (entry.error) {
        this.sentry.captureException(entry.error);
      } else {
        this.sentry.captureMessage(entry.message);
      }
    });
  }

  protected async flushEntries(entries: LogEntry[]): Promise<void> {
    entries.forEach(entry => this.log(entry));
  }

  private mapLogLevelToSentryLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warning';
      case LogLevel.ERROR:
        return 'error';
      case LogLevel.FATAL:
        return 'fatal';
      default:
        return 'info';
    }
  }
}