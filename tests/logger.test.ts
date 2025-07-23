import { HermesTrace, createLogger } from '../src/logger';
import { LogLevel } from '../src/types';
import { ConsoleTransport } from '../src/transports/console';

// Mock window and navigator for browser environment tests
(global as any).window = {
  location: { href: 'https://test.example.com/page' },
  addEventListener: jest.fn()
};

(global as any).navigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)'
};

describe('HermesTrace Logger', () => {
  let logger: HermesTrace;
  let mockTransport: jest.Mocked<any>;

  beforeEach(() => {
    mockTransport = {
      name: 'mock',
      log: jest.fn(),
      flush: jest.fn(),
      close: jest.fn()
    };

    logger = new HermesTrace({
      level: LogLevel.DEBUG,
      transports: [mockTransport],
      autoFlush: false, // Disable auto flush for tests
      captureStackTrace: false // Disable for simpler tests
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic logging functionality', () => {
    test('should log debug messages', () => {
      logger.debug('Debug message', { key: 'value' }, ['tag1']);

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.DEBUG,
          message: 'Debug message',
          context: expect.objectContaining({ key: 'value' }),
          tags: ['tag1'],
          sessionId: expect.any(String),
          timestamp: expect.any(Date)
        })
      );
    });

    test('should log info messages', () => {
      logger.info('Info message');

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          message: 'Info message'
        })
      );
    });

    test('should log warn messages', () => {
      logger.warn('Warning message');

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.WARN,
          message: 'Warning message'
        })
      );
    });

    test('should log error messages with error object', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error, { userId: '123' });

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.ERROR,
          message: 'Error occurred',
          context: expect.objectContaining({ userId: '123' })
        })
      );
    });

    test('should log fatal messages', () => {
      const error = new Error('Fatal error');
      logger.fatal('Fatal error occurred', error);

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.FATAL,
          message: 'Fatal error occurred'
        })
      );
    });
  });

  describe('Log level filtering', () => {
    test('should respect log level configuration', () => {
      const warnLogger = new HermesTrace({
        level: LogLevel.WARN,
        transports: [mockTransport]
      });

      warnLogger.debug('Debug message');
      warnLogger.info('Info message');
      warnLogger.warn('Warn message');
      warnLogger.error('Error message');

      expect(mockTransport.log).toHaveBeenCalledTimes(2);
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({ level: LogLevel.WARN })
      );
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({ level: LogLevel.ERROR })
      );
    });

    test('should allow changing log level dynamically', () => {
      logger.setLevel(LogLevel.ERROR);
      
      logger.info('Info message');
      logger.error('Error message');

      expect(mockTransport.log).toHaveBeenCalledTimes(1);
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({ level: LogLevel.ERROR })
      );
    });
  });

  describe('Transport management', () => {
    test('should add transport', () => {
      const newTransport = { 
        name: 'new', 
        log: jest.fn(),
        config: { level: LogLevel.INFO, enabled: true }
      };
      logger.addTransport(newTransport);

      logger.info('Test message');

      expect(mockTransport.log).toHaveBeenCalled();
      expect(newTransport.log).toHaveBeenCalled();
    });

    test('should remove transport by name', () => {
      logger.removeTransport('mock');
      logger.info('Test message');

      expect(mockTransport.log).not.toHaveBeenCalled();
    });

    test('should handle transport errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockTransport.log.mockImplementation(() => {
        throw new Error('Transport error');
      });

      logger.info('Test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Transport mock failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Context management', () => {
    test('should merge global context with log context', () => {
      logger.setContext({ globalKey: 'globalValue' });
      logger.info('Test message', { localKey: 'localValue' });

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          context: {
            globalKey: 'globalValue',
            localKey: 'localValue'
          }
        })
      );
    });

    test('should override global context with local context', () => {
      logger.setContext({ key: 'global' });
      logger.info('Test message', { key: 'local' });

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          context: { key: 'local' }
        })
      );
    });
  });

  describe('Browser environment capture', () => {
    test('should capture URL when available', () => {
      const urlLogger = new HermesTrace({
        transports: [mockTransport],
        captureUrl: true
      });

      urlLogger.info('Test message');

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.any(String)
        })
      );
    });

    test('should capture user agent when available', () => {
      const uaLogger = new HermesTrace({
        transports: [mockTransport],
        captureUserAgent: true
      });

      uaLogger.info('Test message');

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: expect.any(String)
        })
      );
    });
  });

  describe('Child logger creation', () => {
    test('should create child logger with inherited config', () => {
      logger.setContext({ parent: 'context' });
      const child = logger.createChild({ child: 'context' });

      child.info('Child message');

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          context: {
            parent: 'context',
            child: 'context'
          }
        })
      );
    });
  });

  describe('Session management', () => {
    test('should generate unique session ID', () => {
      const logger1 = new HermesTrace();
      const logger2 = new HermesTrace();

      expect(logger1['sessionId']).toBeDefined();
      expect(logger2['sessionId']).toBeDefined();
      expect(logger1['sessionId']).not.toBe(logger2['sessionId']);
    });

    test('should include session ID in log entries', () => {
      logger.info('Test message');

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: expect.any(String)
        })
      );
    });
  });

  describe('Flush and close operations', () => {
    test('should flush all transports', async () => {
      await logger.flush();

      expect(mockTransport.flush).toHaveBeenCalled();
    });

    test('should handle flush errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockTransport.flush.mockRejectedValue(new Error('Flush error'));

      await logger.flush();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to flush transport mock:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should close all transports', async () => {
      await logger.close();

      expect(mockTransport.flush).toHaveBeenCalled();
      expect(mockTransport.close).toHaveBeenCalled();
    });
  });

  describe('Factory function', () => {
    test('should create logger instance with config', () => {
      const logger = createLogger({
        level: LogLevel.WARN,
        transports: [new ConsoleTransport()]
      });

      expect(logger).toBeInstanceOf(HermesTrace);
    });

    test('should create logger with default config', () => {
      const logger = createLogger();

      expect(logger).toBeInstanceOf(HermesTrace);
    });
  });
});