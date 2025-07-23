import { 
  createLogger, 
  ConsoleTransport, 
  LokiTransport, 
  DatadogTransport,
  SentryTransport,
  LogLevel 
} from 'hermes-trace';

// Create logger instance with multiple transports
const logger = createLogger({
  level: LogLevel.DEBUG,
  transports: [
    new ConsoleTransport({ 
      level: LogLevel.DEBUG,
      format: 'text' 
    }),
    new LokiTransport({
      url: 'http://localhost:3100',
      labels: { 
        service: 'vanilla-js-app',
        environment: 'development' 
      }
    }),
    new DatadogTransport({
      apiKey: 'your-datadog-api-key',
      service: 'vanilla-js-app',
      env: 'development'
    }),
    new SentryTransport({
      dsn: 'your-sentry-dsn',
      environment: 'development'
    })
  ],
  context: { 
    userId: '12345',
    appVersion: '1.0.0' 
  }
});

// Set up global error handlers
window.addEventListener('error', (event) => {
  logger.error('Global error caught', event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    message: event.message
  }, ['global-error']);
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', event.reason, {
    promise: event.promise
  }, ['unhandled-rejection']);
});

// Example usage
function initializeApp() {
  logger.info('Vanilla JS application started', {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });

  setupEventListeners();
  loadUserData();
}

function setupEventListeners() {
  logger.debug('Setting up event listeners');

  document.getElementById('info-btn')?.addEventListener('click', () => {
    logger.info('Info button clicked', {
      action: 'button-click',
      buttonId: 'info-btn',
      timestamp: Date.now()
    });
  });

  document.getElementById('warn-btn')?.addEventListener('click', () => {
    logger.warn('Warning button clicked', {
      action: 'button-click',
      buttonId: 'warn-btn',
      level: 'warning'
    });
  });

  document.getElementById('error-btn')?.addEventListener('click', () => {
    try {
      throw new Error('Intentional error for testing');
    } catch (error) {
      logger.error('Error button handler failed', error, {
        action: 'button-click',
        buttonId: 'error-btn'
      });
    }
  });
}

async function loadUserData() {
  try {
    logger.debug('Loading user data...');
    
    const response = await fetch('/api/user/12345');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const userData = await response.json();
    
    logger.info('User data loaded successfully', {
      userId: userData.id,
      userEmail: userData.email,
      loadTime: Date.now()
    }, ['user-data']);
    
    // Update logger context with user info
    logger.setContext({
      userEmail: userData.email,
      userRole: userData.role
    });
    
  } catch (error) {
    logger.error('Failed to load user data', error, {
      endpoint: '/api/user/12345',
      method: 'GET'
    }, ['api-error']);
  }
}

function performanceLogging() {
  // Log performance metrics
  if (window.performance && window.performance.timing) {
    const timing = window.performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    
    logger.info('Page load performance', {
      loadTime,
      domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstPaint: timing.responseStart - timing.navigationStart
    }, ['performance']);
  }
}

// Custom error class for demonstration
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

function validateForm(formData) {
  try {
    if (!formData.email) {
      throw new ValidationError('Email is required', 'email');
    }
    
    if (!formData.name) {
      throw new ValidationError('Name is required', 'name');
    }
    
    logger.info('Form validation passed', {
      fields: Object.keys(formData),
      timestamp: Date.now()
    }, ['form-validation']);
    
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn('Form validation failed', {
        field: error.field,
        message: error.message,
        formData: formData
      }, ['form-validation', 'validation-error']);
    } else {
      logger.error('Unexpected validation error', error, {
        formData: formData
      }, ['form-validation', 'unexpected-error']);
    }
    throw error;
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  performanceLogging();
});

// Export logger for use in other modules
export default logger;