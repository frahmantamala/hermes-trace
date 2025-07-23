export { HermesTrace, createLogger } from './logger';

export { 
  LogLevel,
  type LogEntry,
  type Transport,
  type TransportConfig,
  type HermesTraceConfig,
  type LokiConfig,
  type DatadogConfig,
  type SentryConfig,
  type ErrorBoundaryConfig,
  type FrameworkIntegration,
  type MaskingConfig,
  type MaskingRule,
} from './types';

export { DataMasker } from './utils/masking';

export { BaseTransport } from './transports/base';
export { ConsoleTransport } from './transports/console';
export { LokiTransport } from './transports/loki';
export { DatadogTransport } from './transports/datadog';
export { SentryTransport } from './transports/sentry';

// Framework integrations are exported from separate entry points
// Use hermes-trace/react, hermes-trace/vue, hermes-trace/angular