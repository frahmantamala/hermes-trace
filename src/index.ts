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

export { 
  ReactIntegration,
  HermesErrorBoundary,
  withHermesLogging,
  useHermesLogger as useReactHermesLogger,
} from './integrations/react';

export {
  VueIntegration,
  createVuePlugin,
  useHermesLogger as useVueHermesLogger,
} from './integrations/vue';

export {
  AngularIntegration,
  HermesErrorHandler,
  HermesLoggerService,
  HermesHttpInterceptor,
  HermesRouterLogger,
  provideHermesLogger,
  type HermesAngularConfig,
} from './integrations/angular';