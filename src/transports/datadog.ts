import { BaseTransport } from './base';
import { LogEntry, DatadogConfig } from '../types';

interface DatadogLogPayload {
  ddsource: string;
  ddtags: string;
  hostname?: string;
  message: string;
  service: string;
  timestamp: number;
  level: string;
  logger?: {
    name: string;
    version?: string;
  };
  [key: string]: any;
}

export class DatadogTransport extends BaseTransport {
  private readonly apiKey: string;
  private readonly service: string;
  private readonly env?: string;
  private readonly version?: string;
  private readonly hostname?: string;
  private readonly source: string;
  private readonly tags: string[];

  constructor(config: DatadogConfig) {
    super('datadog', config);
    this.apiKey = config.apiKey;
    this.service = config.service;
    this.env = config.env;
    this.version = config.version;
    this.hostname = config.hostname;
    this.source = config.source || 'browser';
    this.tags = config.tags || [];
  }

  public log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;
    this.addToBuffer(entry);
  }

  protected async flushEntries(entries: LogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    const payload = entries.map(entry => this.createDatadogPayload(entry));

    try {
      const response = await fetch('https://http-intake.logs.datadoghq.com/v1/input/' + this.apiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Datadog transport failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to send logs to Datadog: ${error}`);
    }
  }

  private createDatadogPayload(entry: LogEntry): DatadogLogPayload {
    const tags = [
      ...this.tags,
      ...(entry.tags || []),
      ...(this.env ? [`env:${this.env}`] : []),
      ...(this.version ? [`version:${this.version}`] : []),
      ...(entry.userId ? [`user_id:${entry.userId}`] : []),
      ...(entry.sessionId ? [`session_id:${entry.sessionId}`] : []),
    ];

    const payload: DatadogLogPayload = {
      ddsource: this.source,
      ddtags: tags.join(','),
      message: entry.message,
      service: this.service,
      timestamp: entry.timestamp.getTime(),
      level: entry.level,
      logger: {
        name: 'hermes-trace',
      },
    };

    if (this.hostname) {
      payload.hostname = this.hostname;
    }

    if (entry.context) {
      Object.assign(payload, entry.context);
    }

    if (entry.error) {
      payload.error = {
        message: entry.error.message,
        name: entry.error.name,
        stack: entry.error.stack,
      };
    }

    if (entry.url) {
      payload.http = {
        url: entry.url,
      };
    }

    if (entry.userAgent) {
      payload.user_agent = entry.userAgent;
    }

    if (entry.stack) {
      payload.stack = entry.stack;
    }

    return payload;
  }
}