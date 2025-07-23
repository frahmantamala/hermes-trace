export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
  tags?: string[];
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  stack?: string;
}

export interface TransportConfig {
  level?: LogLevel;
  enabled?: boolean;
  format?: 'json' | 'text';
  bufferSize?: number;
  flushInterval?: number;
}

export type MaskingRule = {
  field: string | RegExp;
  mask?: string;
  partial?: boolean;
  preserveLength?: boolean;
};

export interface MaskingConfig {
  enabled?: boolean;
  defaultMask?: string;
  rules?: MaskingRule[];
  sensitiveFields?: string[];
  customMasker?: ((key: string, value: any) => any) | null;
}

export interface HermesTraceConfig {
  level?: LogLevel;
  transports?: Transport[];
  context?: Record<string, any>;
  captureUserAgent?: boolean;
  captureUrl?: boolean;
  captureStackTrace?: boolean;
  maxBufferSize?: number;
  autoFlush?: boolean;
  flushInterval?: number;
  masking?: MaskingConfig;
}

export interface Transport {
  name: string;
  config: TransportConfig;
  log(entry: LogEntry): Promise<void> | void;
  flush?(): Promise<void> | void;
  close?(): Promise<void> | void;
}

export interface LokiConfig extends TransportConfig {
  url: string;
  labels?: Record<string, string>;
  basicAuth?: {
    username: string;
    password: string;
  };
  headers?: Record<string, string>;
}

export interface DatadogConfig extends TransportConfig {
  apiKey: string;
  service: string;
  env?: string;
  version?: string;
  hostname?: string;
  source?: string;
  tags?: string[];
}

export interface SentryConfig extends TransportConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  sampleRate?: number;
}

export interface ErrorBoundaryConfig {
  fallback?: React.ComponentType<any>;
  onError?: (error: Error, errorInfo: any) => void;
  tags?: string[];
  context?: Record<string, any>;
}

export interface FrameworkIntegration {
  install(logger: any): void;
  uninstall?(): void;
}