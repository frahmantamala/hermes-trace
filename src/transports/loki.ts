import { BaseTransport } from './base';
import { LogEntry, LokiConfig } from '../types';

interface LokiStream {
  stream: Record<string, string>;
  values: [string, string][];
}

interface LokiPayload {
  streams: LokiStream[];
}

export class LokiTransport extends BaseTransport {
  private readonly url: string;
  private readonly labels: Record<string, string>;
  private readonly headers: Record<string, string>;

  constructor(config: LokiConfig) {
    super('loki', config);
    this.url = config.url;
    this.labels = {
      service: 'hermes-trace',
      level: 'info',
      ...config.labels,
    };
    
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    if (config.basicAuth) {
      const auth = btoa(`${config.basicAuth.username}:${config.basicAuth.password}`);
      this.headers['Authorization'] = `Basic ${auth}`;
    }
  }

  public log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;
    this.addToBuffer(entry);
  }

  protected async flushEntries(entries: LogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    const streams = this.groupEntriesByLabels(entries);
    const payload: LokiPayload = { streams };

    try {
      const response = await fetch(`${this.url}/loki/api/v1/push`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Loki transport failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to send logs to Loki: ${error}`);
    }
  }

  private groupEntriesByLabels(entries: LogEntry[]): LokiStream[] {
    const streamMap = new Map<string, LokiStream>();

    entries.forEach(entry => {
      const streamLabels = {
        ...this.labels,
        level: entry.level,
        ...(entry.tags && { tags: entry.tags.join(',') }),
        ...(entry.userId && { userId: entry.userId }),
        ...(entry.url && { url: new URL(entry.url).pathname }),
      };

      const streamKey = JSON.stringify(streamLabels);
      
      if (!streamMap.has(streamKey)) {
        streamMap.set(streamKey, {
          stream: streamLabels,
          values: [],
        });
      }

      const logLine = JSON.stringify({
        message: entry.message,
        context: entry.context,
        sessionId: entry.sessionId,
        userAgent: entry.userAgent,
        stack: entry.stack,
      });

      streamMap.get(streamKey)!.values.push([
        (entry.timestamp.getTime() * 1000000).toString(),
        logLine,
      ]);
    });

    return Array.from(streamMap.values());
  }
}