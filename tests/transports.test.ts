import { ConsoleTransport } from '../src/transports/console';
import { LokiTransport } from '../src/transports/loki';
import { DatadogTransport } from '../src/transports/datadog';
import { SentryTransport } from '../src/transports/sentry';
import { LogLevel, LogEntry } from '../src/types';

const mockLogEntry: LogEntry = {
  level: LogLevel.INFO,
  message: 'Test message',
  timestamp: new Date('2023-01-01T00:00:00Z'),
  context: { key: 'value' },
  tags: ['test'],
  sessionId: 'test-session',
  url: 'https://example.com',
  userAgent: 'Test Browser'
};

describe('Transport Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ConsoleTransport', () => {
    let transport: ConsoleTransport;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      transport = new ConsoleTransport({ level: LogLevel.DEBUG });
      consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should log to console with correct format', () => {
      transport.log(mockLogEntry);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message'),
        { key: 'value' }
      );
    });

    test('should respect log level filtering', () => {
      const warnTransport = new ConsoleTransport({ level: LogLevel.WARN });
      
      warnTransport.log({ ...mockLogEntry, level: LogLevel.DEBUG });
      warnTransport.log({ ...mockLogEntry, level: LogLevel.WARN });

      expect(consoleSpy).toHaveBeenCalledTimes(0);
      
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      warnTransport.log({ ...mockLogEntry, level: LogLevel.WARN });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      warnSpy.mockRestore();
    });

    test('should handle different log levels with appropriate console methods', () => {
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      transport.log({ ...mockLogEntry, level: LogLevel.DEBUG });
      transport.log({ ...mockLogEntry, level: LogLevel.WARN });
      transport.log({ ...mockLogEntry, level: LogLevel.ERROR });

      expect(debugSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();

      debugSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('LokiTransport', () => {
    let transport: LokiTransport;
    let fetchMock: jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
      fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response);

      transport = new LokiTransport({
        url: 'http://localhost:3100',
        labels: { service: 'test-service' },
        flushInterval: 0 // Disable auto flush
      });
    });

    test('should buffer log entries', () => {
      transport.log(mockLogEntry);
      
      expect(fetchMock).not.toHaveBeenCalled();
      expect(transport['buffer']).toHaveLength(1);
    });

    test('should flush entries to Loki API', async () => {
      transport.log(mockLogEntry);
      await transport.flush();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3100/loki/api/v1/push',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('Test message')
        })
      );
    });

    test('should group entries by labels', async () => {
      transport.log({ ...mockLogEntry, level: LogLevel.INFO });
      transport.log({ ...mockLogEntry, level: LogLevel.ERROR });
      
      await transport.flush();

      const callArgs = fetchMock.mock.calls[0];
      const payload = JSON.parse(callArgs[1]?.body as string);
      
      expect(payload.streams).toHaveLength(2); // Different levels create different streams
    });

    test('should handle authentication', () => {
      const authTransport = new LokiTransport({
        url: 'http://localhost:3100',
        basicAuth: { username: 'user', password: 'pass' }
      });

      expect(authTransport['headers']['Authorization']).toContain('Basic');
    });

    test('should handle flush errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      fetchMock.mockRejectedValue(new Error('Network error'));
      
      transport.log(mockLogEntry);
      
      // The flush method catches errors and logs them, it doesn't rethrow
      await transport.flush();
      
      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('DatadogTransport', () => {
    let transport: DatadogTransport;
    let fetchMock: jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
      fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response);

      transport = new DatadogTransport({
        apiKey: 'test-api-key',
        service: 'test-service',
        env: 'test',
        version: '1.0.0',
        flushInterval: 0
      });
    });

    test('should format payload correctly for Datadog', async () => {
      transport.log(mockLogEntry);
      await transport.flush();

      const callArgs = fetchMock.mock.calls[0];
      const payload = JSON.parse(callArgs[1]?.body as string);
      
      expect(payload[0]).toMatchObject({
        ddsource: 'browser',
        message: 'Test message',
        service: 'test-service',
        level: LogLevel.INFO,
        timestamp: expect.any(Number)
      });
    });

    test('should include tags in Datadog format', async () => {
      transport.log(mockLogEntry);
      await transport.flush();

      const callArgs = fetchMock.mock.calls[0];
      const payload = JSON.parse(callArgs[1]?.body as string);
      
      expect(payload[0].ddtags).toContain('env:test');
      expect(payload[0].ddtags).toContain('version:1.0.0');
    });

    test('should send to correct Datadog endpoint', async () => {
      transport.log(mockLogEntry);
      await transport.flush();

      expect(fetchMock).toHaveBeenCalledWith(
        'https://http-intake.logs.datadoghq.com/v1/input/test-api-key',
        expect.any(Object)
      );
    });
  });

  describe('SentryTransport', () => {
    let transport: SentryTransport;

    beforeEach(() => {
      // Mock the dynamic import
      jest.doMock('@sentry/browser', () => ({
        init: jest.fn(),
        captureException: jest.fn(),
        captureMessage: jest.fn(),
        withScope: jest.fn((callback) => {
          const mockScope = {
            setTag: jest.fn(),
            setUser: jest.fn(),
            setContext: jest.fn(),
            setLevel: jest.fn()
          };
          callback(mockScope);
        }),
      }), { virtual: true });

      transport = new SentryTransport({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
        release: '1.0.0',
        sampleRate: 1.0
      });
    });

    test('should initialize Sentry with correct config', () => {
      // This test would need more complex mocking to fully test initialization
      expect(transport).toBeDefined();
    });

    test('should map log levels to Sentry levels', () => {
      const mapping = transport['mapLogLevelToSentryLevel'];
      
      expect(mapping(LogLevel.DEBUG)).toBe('debug');
      expect(mapping(LogLevel.INFO)).toBe('info');
      expect(mapping(LogLevel.WARN)).toBe('warning');
      expect(mapping(LogLevel.ERROR)).toBe('error');
      expect(mapping(LogLevel.FATAL)).toBe('fatal');
    });
  });

  describe('BaseTransport Buffer Management', () => {
    let transport: LokiTransport;
    let fetchMock: jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
      fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response);

      transport = new LokiTransport({
        url: 'http://localhost:3100',
        bufferSize: 2,
        flushInterval: 0 // Disable auto flush
      });
    });

    test('should auto-flush when buffer size exceeded', () => {
      const flushSpy = jest.spyOn(transport, 'flush');
      
      transport.log(mockLogEntry);
      transport.log(mockLogEntry);
      transport.log(mockLogEntry); // This should trigger flush

      expect(flushSpy).toHaveBeenCalled();
    });

    test('should clear buffer after flush', async () => {
      transport.log(mockLogEntry);
      expect(transport['buffer']).toHaveLength(1);

      await transport.flush();
      expect(transport['buffer']).toHaveLength(0);
    });

    test('should handle flush errors by restoring buffer', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const originalFlushEntries = transport['flushEntries'];
      transport['flushEntries'] = jest.fn().mockRejectedValue(new Error('Flush failed'));
      
      transport.log(mockLogEntry);
      await transport.flush();

      // Buffer should be restored on error
      expect(transport['buffer']).toHaveLength(1);
      
      transport['flushEntries'] = originalFlushEntries;
      consoleSpy.mockRestore();
    });
  });
});