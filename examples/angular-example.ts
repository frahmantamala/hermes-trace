import { Component, Injectable, ErrorHandler, NgModule } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Router } from '@angular/router';
import { 
  createLogger,
  ConsoleTransport,
  LokiTransport,
  DatadogTransport,
  HermesLoggerService,
  HermesErrorHandler,
  HermesHttpInterceptor,
  HermesRouterLogger,
  provideHermesLogger,
  LogLevel
} from 'hermes-trace';

const logger = createLogger({
  level: LogLevel.DEBUG,
  transports: [
    new ConsoleTransport({ level: LogLevel.DEBUG }),
    new LokiTransport({
      url: 'http://localhost:3100',
      labels: { service: 'my-angular-app' }
    }),
    new DatadogTransport({
      apiKey: 'your-datadog-api-key',
      service: 'my-angular-app',
      env: 'production'
    })
  ],
  context: { userId: '12345' }
});

@Component({
  selector: 'app-example',
  template: `
    <div class="angular-example">
      <header>
        <h1>HermesTrace Angular Example</h1>
      </header>
      <main>
        <div>
          <h3>Angular Component</h3>
          <button (click)="handleClick()">Log Info</button>
          <button (click)="handleError()">Trigger Error</button>
          <button (click)="handleWarning()">Log Warning</button>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .angular-example {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    button {
      margin: 5px;
      padding: 10px 15px;
      background: #dd0031;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:hover {
      background: #c3002f;
    }
  `]
})
export class ExampleComponent {
  constructor(private hermesLogger: HermesLoggerService) {}

  ngOnInit() {
    this.hermesLogger.info('Angular component initialized', {
      component: 'ExampleComponent',
      framework: 'Angular',
      version: '15.x'
    });
  }

  handleClick() {
    this.hermesLogger.info('Button clicked', {
      action: 'click',
      timestamp: Date.now()
    });
  }

  handleError() {
    try {
      throw new Error('Intentional error for testing');
    } catch (error) {
      this.hermesLogger.error('Error in button handler', error as Error, {
        action: 'error-test'
      });
    }
  }

  handleWarning() {
    this.hermesLogger.warn('This is a warning message', {
      action: 'warning-test',
      level: 'warn'
    });
  }
}

@Injectable()
export class CustomErrorHandler implements ErrorHandler {
  constructor(private hermesErrorHandler: HermesErrorHandler) {}

  handleError(error: any): void {
    this.hermesErrorHandler.handleError(error);
  }
}

@Injectable()
export class LoggingHttpInterceptor implements HttpInterceptor {
  constructor(private hermesInterceptor: HermesHttpInterceptor) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return this.hermesInterceptor.intercept(req, next);
  }
}

@NgModule({
  declarations: [ExampleComponent],
  providers: [
    ...provideHermesLogger(logger),
    {
      provide: ErrorHandler,
      useClass: CustomErrorHandler
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoggingHttpInterceptor,
      multi: true
    }
  ],
  bootstrap: [ExampleComponent]
})
export class AppModule {
  constructor(private router: Router) {
    new HermesRouterLogger(logger, router);
    
    logger.info('Angular app started', {
      framework: 'Angular',
      version: '15.x'
    });
  }
}