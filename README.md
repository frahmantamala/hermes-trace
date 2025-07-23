# HermesTrace

Universal frontend logging for modern web apps. Drop it into React, Vue, Angular, or vanilla JavaScript and start shipping logs to Loki, Datadog, or Sentry.

## Why HermesTrace?

Web apps fail in ways you can't predict. HermesTrace helps us understand what went wrong by capturing errors, user actions, and performance data across your entire frontend stack.

## Installation

```bash
npm install hermes-trace
```

Optional peer dependencies:
```bash
npm install @sentry/browser  # for Sentry transport
```

## Basic Usage

```javascript
import { createLogger, ConsoleTransport } from 'hermes-trace';

const logger = createLogger({
  transports: [new ConsoleTransport()]
});

logger.info('User logged in', { userId: '123' });
logger.error('Payment failed', error, { amount: 99.99 });
```

## Sending Logs Elsewhere

### Grafana Loki
```javascript
import { LokiTransport } from 'hermes-trace';

new LokiTransport({
  url: 'http://localhost:3100',
  labels: { service: 'my-app', env: 'prod' }
})
```

### Datadog
```javascript
import { DatadogTransport } from 'hermes-trace';

new DatadogTransport({
  apiKey: 'your-key',
  service: 'my-app',
  env: 'production'
})
```

### Sentry
```javascript
import { SentryTransport } from 'hermes-trace';

new SentryTransport({
  dsn: 'your-sentry-dsn',
  environment: 'production'
})
```

## Framework Integration

### React

Wrap your app with error boundaries and get automatic error logging:

```jsx
import { HermesErrorBoundary, useReactHermesLogger } from 'hermes-trace';

function App() {
  return (
    <HermesErrorBoundary logger={logger}>
      <MyComponent />
    </HermesErrorBoundary>
  );
}

function MyComponent() {
  const { logInfo, logError } = useReactHermesLogger(logger);
  
  const handleClick = () => {
    logInfo('Button clicked', { buttonId: 'submit' });
  };
  
  return <button onClick={handleClick}>Submit</button>;
}
```

### Vue 3

```javascript
import { createVuePlugin } from 'hermes-trace';

app.use(createVuePlugin(logger));

// Now use in any component
export default {
  methods: {
    handleSubmit() {
      this.$logInfo('Form submitted', { formId: 'contact' });
    }
  }
}
```

### Angular

```typescript
import { HermesLoggerService, provideHermesLogger } from 'hermes-trace';

@NgModule({
  providers: [...provideHermesLogger(logger)]
})
export class AppModule {}

@Component({...})
export class MyComponent {
  constructor(private logger: HermesLoggerService) {}
  
  onSubmit() {
    this.logger.info('Form submitted', { userId: this.userId });
  }
}
```

## Protecting Sensitive Data

HermesTrace automatically masks passwords, tokens, and other sensitive fields:

```javascript
const logger = createLogger({
  masking: {
    enabled: true,
    sensitiveFields: ['password', 'ssn', 'creditCard']
  }
});

logger.info('User data', {
  email: 'user@example.com',     // becomes: u***@example.com
  password: 'secret123',         // becomes: ***
  username: 'john_doe'           // unchanged
});
```

Custom masking rules:
```javascript
logger.addMaskingRule({
  field: /.*token.*/i,
  mask: '[REDACTED]',
  partial: true
});
```

## Log Levels

```javascript
logger.debug('Detailed info for debugging');
logger.info('General app flow');
logger.warn('Something unexpected happened');
logger.error('Error occurred', error);
logger.fatal('Critical system failure', error);
```

## Context and Tags

Add context that gets included with every log:

```javascript
logger.setContext({ userId: '123', version: '2.1.0' });

// Create child loggers for specific features
const authLogger = logger.createChild({ module: 'auth' });
authLogger.info('Login attempt');  // includes module: 'auth'

// Add tags for filtering
logger.info('Payment processed', { amount: 99.99 }, ['payment', 'success']);
```

## Configuration

```javascript
const logger = createLogger({
  level: LogLevel.INFO,           // minimum log level
  captureStackTrace: true,        // include stack traces
  captureUrl: true,              // include current URL
  captureUserAgent: true,        // include browser info
  autoFlush: true,               // automatically send logs
  flushInterval: 5000,           // flush every 5 seconds
  masking: {
    enabled: true,
    defaultMask: '***'
  }
});
```

## Performance

HermesTrace buffers logs in memory and sends them in batches. Logs are automatically flushed when:
- Buffer reaches configured size (default: 100 entries)
- Time interval passes (default: 5 seconds)  
- Page is about to unload

Force immediate sending:
```javascript
await logger.flush();
```

## Browser Support

Works in all modern browsers. Uses `fetch()` for HTTP transports, `console` API for local logging.

## Examples

Check the [examples](./examples) folder for complete implementations:
- [React](./examples/react-example.tsx)
- [Vue](./examples/vue-example.vue)
- [Angular](./examples/angular-example.ts)
- [Vanilla JS](./examples/vanilla-js-example.js)
- [Data Masking](./examples/masking-example.js)

## License

MIT