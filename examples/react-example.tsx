import React from 'react';
import { 
  createLogger, 
  ConsoleTransport, 
  LokiTransport, 
  DatadogTransport,
  SentryTransport,
  HermesErrorBoundary,
  withHermesLogging,
  useReactHermesLogger,
  LogLevel
} from 'hermes-trace';

const logger = createLogger({
  level: LogLevel.DEBUG,
  transports: [
    new ConsoleTransport({ level: LogLevel.DEBUG }),
    new LokiTransport({
      url: 'http://localhost:3100',
      labels: { service: 'my-react-app' }
    }),
    new DatadogTransport({
      apiKey: 'your-datadog-api-key',
      service: 'my-react-app',
      env: 'production'
    }),
    new SentryTransport({
      dsn: 'your-sentry-dsn',
      environment: 'production'
    })
  ],
  context: { userId: '12345' }
});

const ErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ error, resetError }) => (
  <div role="alert" style={{ padding: '20px', border: '1px solid red' }}>
    <h2>Something went wrong:</h2>
    <pre>{error?.message}</pre>
    <button onClick={resetError}>Try again</button>
  </div>
);

const MyComponent: React.FC = () => {
  const { logInfo, logError, logWarn } = useReactHermesLogger(logger, 'MyComponent');

  const handleClick = () => {
    logInfo('Button clicked', { action: 'click', timestamp: Date.now() });
  };

  const handleError = () => {
    try {
      throw new Error('Intentional error for testing');
    } catch (error) {
      logError('Error in button handler', error as Error, { action: 'error-test' });
    }
  };

  React.useEffect(() => {
    logInfo('Component mounted');
    return () => logInfo('Component will unmount');
  }, [logInfo]);

  return (
    <div>
      <h3>My Component</h3>
      <button onClick={handleClick}>Log Info</button>
      <button onClick={handleError}>Trigger Error</button>
    </div>
  );
};

const EnhancedComponent = withHermesLogging(MyComponent, logger, 'EnhancedMyComponent');

const App: React.FC = () => {
  React.useEffect(() => {
    logger.info('React app started', { framework: 'React', version: '18.x' });
  }, []);

  return (
    <HermesErrorBoundary 
      logger={logger}
      fallback={ErrorFallback}
      tags={['app-boundary']}
      context={{ app: 'react-example' }}
    >
      <div className="App">
        <header>
          <h1>HermesTrace React Example</h1>
        </header>
        <main>
          <MyComponent />
          <EnhancedComponent />
        </main>
      </div>
    </HermesErrorBoundary>
  );
};

export default App;