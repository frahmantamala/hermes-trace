import { HermesTrace } from '../logger';
import { FrameworkIntegration } from '../types';

export class AngularIntegration implements FrameworkIntegration {
  private logger?: HermesTrace;

  install(logger: HermesTrace): void {
    this.logger = logger;
  }

  uninstall(): void {
    this.logger = undefined;
  }
}

export class HermesErrorHandler {
  constructor(private logger: HermesTrace) {}

  handleError(error: any): void {
    const errorObj = error.rejection || error.error || error;
    
    this.logger.error('Angular error caught', errorObj, {
      angularError: true,
      originalError: error,
    }, ['angular-error']);
  }
}

export class HermesLoggerService {
  constructor(private logger: HermesTrace) {}

  debug(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.logger.debug(message, context, [...(tags || []), 'angular-service']);
  }

  info(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.logger.info(message, context, [...(tags || []), 'angular-service']);
  }

  warn(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.logger.warn(message, context, [...(tags || []), 'angular-service']);
  }

  error(message: string, error?: Error, context?: Record<string, any>, tags?: string[]): void {
    this.logger.error(message, error, context, [...(tags || []), 'angular-service']);
  }

  fatal(message: string, error?: Error, context?: Record<string, any>, tags?: string[]): void {
    this.logger.fatal(message, error, context, [...(tags || []), 'angular-service']);
  }

  createChild(context: Record<string, any>): HermesTrace {
    return this.logger.createChild(context);
  }
}

export const provideHermesLogger = (logger: HermesTrace) => {
  return [
    { provide: HermesLoggerService, useValue: new HermesLoggerService(logger) },
    { provide: 'ErrorHandler', useValue: new HermesErrorHandler(logger) },
  ];
};

export interface HermesAngularConfig {
  logger: HermesTrace;
  enableRouterLogging?: boolean;
  enableHttpInterceptor?: boolean;
}

export class HermesHttpInterceptor {
  constructor(private logger: HermesTrace) {}

  intercept(req: any, next: any): any {
    const startTime = Date.now();
    
    this.logger.debug(`HTTP ${req.method} ${req.url} started`, {
      method: req.method,
      url: req.url,
      headers: req.headers,
    }, ['http-request']);

    return next.handle(req).pipe(
      (response: any) => {
        const duration = Date.now() - startTime;
        
        if (response.type === 4) {
          this.logger.info(`HTTP ${req.method} ${req.url} completed`, {
            method: req.method,
            url: req.url,
            status: response.status,
            duration,
          }, ['http-response']);
        }
        
        return response;
      },
      (error: any) => {
        const duration = Date.now() - startTime;
        
        this.logger.error(`HTTP ${req.method} ${req.url} failed`, error, {
          method: req.method,
          url: req.url,
          status: error.status,
          duration,
        }, ['http-error']);
        
        throw error;
      }
    );
  }
}

export class HermesRouterLogger {
  constructor(private logger: HermesTrace, private router: any) {
    this.setupRouterLogging();
  }

  private setupRouterLogging(): void {
    this.router.events.subscribe((event: any) => {
      if (event.constructor.name === 'NavigationStart') {
        this.logger.info('Navigation started', {
          url: event.url,
          id: event.id,
          trigger: event.trigger,
        }, ['router-navigation']);
      }
      
      if (event.constructor.name === 'NavigationEnd') {
        this.logger.info('Navigation completed', {
          url: event.url,
          urlAfterRedirects: event.urlAfterRedirects,
          id: event.id,
        }, ['router-navigation']);
      }
      
      if (event.constructor.name === 'NavigationError') {
        this.logger.error('Navigation error', event.error, {
          url: event.url,
          id: event.id,
        }, ['router-error']);
      }
    });
  }
}