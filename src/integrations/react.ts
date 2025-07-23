let React: any;

try {
  React = require('react');
} catch (e) {
  // React not available
}
import { HermesTrace } from '../logger';
import { FrameworkIntegration, ErrorBoundaryConfig } from '../types';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps extends ErrorBoundaryConfig {
  children: React.ReactNode;
  logger: HermesTrace;
}

export class ReactIntegration implements FrameworkIntegration {
  private logger?: HermesTrace;
  private originalConsoleError?: typeof console.error;

  install(logger: HermesTrace): void {
    this.logger = logger;
    this.setupGlobalErrorHandling();
    this.setupUnhandledRejectionHandling();
  }

  uninstall(): void {
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
    }
  }

  private setupGlobalErrorHandling(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logger?.error('Global error caught', event.error, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }, ['global-error']);
      });
    }
  }

  private setupUnhandledRejectionHandling(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.logger?.error('Unhandled promise rejection', event.reason, {
          promise: event.promise,
        }, ['unhandled-rejection']);
      });
    }
  }
}

export class HermesErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { logger, onError, tags = [], context = {} } = this.props;
    
    logger.error('React Error Boundary caught error', error, {
      ...context,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    }, [...tags, 'error-boundary']);

    if (onError) {
      onError(error, errorInfo);
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback) {
        return React.createElement(Fallback, { 
          error: this.state.error,
          resetError: () => this.setState({ hasError: false, error: undefined })
        });
      }

      return React.createElement('div', {
        style: {
          padding: '20px',
          border: '1px solid #ff6b6b',
          borderRadius: '4px',
          backgroundColor: '#ffe0e0',
          color: '#d63031',
          margin: '10px 0',
        }
      }, 'Something went wrong. Please try refreshing the page.');
    }

    return this.props.children;
  }
}

export const withHermesLogging = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  logger: HermesTrace,
  componentName?: string
) => {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const WithHermesLogging: React.FC<P> = (props) => {
    React.useEffect(() => {
      logger.debug(`Component ${displayName} mounted`, { component: displayName }, ['component-lifecycle']);
      
      return () => {
        logger.debug(`Component ${displayName} unmounted`, { component: displayName }, ['component-lifecycle']);
      };
    }, []);

    const handleError = React.useCallback((error: Error, errorInfo?: any) => {
      logger.error(`Error in component ${displayName}`, error, {
        component: displayName,
        props: JSON.stringify(props),
        errorInfo,
      }, ['component-error']);
    }, [props]);

    return React.createElement(HermesErrorBoundary, {
      logger,
      onError: handleError,
      tags: ['hoc-wrapped'],
      context: { component: displayName },
      children: React.createElement(WrappedComponent, props)
    });
  };

  WithHermesLogging.displayName = `withHermesLogging(${displayName})`;
  return WithHermesLogging;
};

export const useHermesLogger = (logger: HermesTrace, componentName?: string) => {
  const name = componentName || 'UnknownComponent';
  
  React.useEffect(() => {
    logger.debug(`Hook useHermesLogger initialized in ${name}`, { component: name }, ['hook-init']);
  }, [logger, name]);

  const logInfo = React.useCallback((message: string, context?: Record<string, any>) => {
    logger.info(message, { ...context, component: name }, ['hook-log']);
  }, [logger, name]);

  const logError = React.useCallback((message: string, error?: Error, context?: Record<string, any>) => {
    logger.error(message, error, { ...context, component: name }, ['hook-error']);
  }, [logger, name]);

  const logWarn = React.useCallback((message: string, context?: Record<string, any>) => {
    logger.warn(message, { ...context, component: name }, ['hook-warn']);
  }, [logger, name]);

  return { logInfo, logError, logWarn };
};