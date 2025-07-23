import { VueIntegration, createVuePlugin } from '../src/integrations/vue';
import { HermesErrorBoundary } from '../src/integrations/react';
import { HermesTrace } from '../src/logger';
import { LogLevel } from '../src/types';

// Mock React for testing
jest.mock('react', () => ({
  Component: class Component {
    constructor(props: any) {}
    setState() {}
    render() {}
  },
  createElement: jest.fn()
}), { virtual: true });

describe('Framework Integrations', () => {
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
      autoFlush: false
    });
  });

  describe('Vue Integration', () => {
    let integration: VueIntegration;

    beforeEach(() => {
      integration = new VueIntegration();
      integration.install(logger);
    });

    describe('Vue 2 Integration', () => {
      let mockVue: any;

      beforeEach(() => {
        mockVue = {
          config: {},
          mixin: jest.fn(),
          prototype: {}
        };
      });

      test('should install Vue 2 error handler', () => {
        integration.installVue2(mockVue);

        expect(mockVue.config.errorHandler).toBeDefined();
        expect(mockVue.mixin).toHaveBeenCalled();
        expect(mockVue.prototype.$logInfo).toBeDefined();
        expect(mockVue.prototype.$logError).toBeDefined();
        expect(mockVue.prototype.$logWarn).toBeDefined();
      });

      test('should handle Vue 2 errors', () => {
        integration.installVue2(mockVue);

        const error = new Error('Vue component error');
        const vm = {
          $options: { name: 'TestComponent', propsData: { id: 1 } },
          $vnode: { tag: 'div' }
        };

        mockVue.config.errorHandler(error, vm, 'render');

        expect(mockTransport.log).toHaveBeenCalledWith(
          expect.objectContaining({
            level: LogLevel.ERROR,
            message: 'Vue 2 error caught',
            context: expect.objectContaining({
              componentName: 'TestComponent',
              componentTag: 'div',
              info: 'render',
              propsData: { id: 1 }
            }),
            tags: ['vue2-error']
          })
        );
      });

      test('should handle Vue 2 component lifecycle', () => {
        integration.installVue2(mockVue);

        const mixinConfig = mockVue.mixin.mock.calls[0][0];
        expect(mixinConfig.created).toBeDefined();
        expect(mixinConfig.beforeDestroy).toBeDefined();
      });
    });

    describe('Vue 3 Integration', () => {
      let mockApp: any;

      beforeEach(() => {
        mockApp = {
          config: {
            errorHandler: null,
            globalProperties: {}
          },
          mixin: jest.fn()
        };
      });

      test('should install Vue 3 error handler', () => {
        integration.installVue3(mockApp);

        expect(mockApp.config.errorHandler).toBeDefined();
        expect(mockApp.config.globalProperties).toHaveProperty('$hermesLogger');
        expect(mockApp.config.globalProperties.$logInfo).toBeDefined();
        expect(mockApp.config.globalProperties.$logError).toBeDefined();
        expect(mockApp.config.globalProperties.$logWarn).toBeDefined();
        expect(mockApp.mixin).toHaveBeenCalled();
      });

      test('should handle Vue 3 errors', () => {
        integration.installVue3(mockApp);

        const error = new Error('Vue 3 component error');
        const instance = {
          type: { name: 'TestComponent' },
          props: { id: 1 }
        };

        mockApp.config.errorHandler(error, instance, 'render');

        expect(mockTransport.log).toHaveBeenCalledWith(
          expect.objectContaining({
            level: LogLevel.ERROR,
            message: 'Vue 3 error caught',
            context: expect.objectContaining({
              componentName: 'TestComponent',
              info: 'render',
              props: { id: 1 }
            }),
            tags: ['vue3-error']
          })
        );
      });

      test('should uninstall Vue 3 integration', () => {
        integration.installVue3(mockApp);
        integration.uninstall();

        expect(mockApp.config.globalProperties.$hermesLogger).toBeUndefined();
        expect(mockApp.config.globalProperties.$logInfo).toBeUndefined();
        expect(mockApp.config.globalProperties.$logError).toBeUndefined();
        expect(mockApp.config.globalProperties.$logWarn).toBeUndefined();
      });
    });

    describe('Vue Plugin Factory', () => {
      test('should create Vue plugin with logger', () => {
        const plugin = createVuePlugin(logger);

        expect(plugin).toHaveProperty('install');
        expect(typeof plugin.install).toBe('function');
      });

      test('should install plugin on Vue app', () => {
        const plugin = createVuePlugin(logger);
        const mockApp = {
          config: {
            errorHandler: null,
            globalProperties: {}
          },
          mixin: jest.fn()
        };

        plugin.install(mockApp);

        expect(mockApp.config.errorHandler).toBeDefined();
        expect(mockApp.config.globalProperties).toHaveProperty('$hermesLogger');
      });
    });
  });

  describe('React Integration', () => {
    let errorBoundary: HermesErrorBoundary;

    beforeEach(() => {
      errorBoundary = new HermesErrorBoundary({ logger, children: 'test' });
    });

    test('should initialize with correct state', () => {
      expect(errorBoundary.state.hasError).toBe(false);
      expect(errorBoundary.state.error).toBeUndefined();
    });

    test('should catch errors and update state', () => {
      const error = new Error('React component error');
      const errorInfo = {
        componentStack: 'in TestComponent\n  in App'
      };

      const newState = HermesErrorBoundary.getDerivedStateFromError(error);

      expect(newState).toEqual({
        hasError: true,
        error
      });
    });

    test('should have componentDidCatch method', () => {
      expect(typeof errorBoundary.componentDidCatch).toBe('function');
    });

    test('should have render method', () => {
      expect(typeof errorBoundary.render).toBe('function');
    });

    test('should be instance of error boundary', () => {
      expect(errorBoundary).toBeInstanceOf(HermesErrorBoundary);
    });
  });

  describe('Integration Error Handling', () => {
    test('should handle missing logger gracefully', () => {
      const integration = new VueIntegration();
      // Don't install logger
      
      const mockVue = {
        config: {},
        mixin: jest.fn(),
        prototype: {}
      };

      expect(() => integration.installVue2(mockVue)).not.toThrow();
    });

    test('should handle React error boundary without logger', () => {
      const mockLogger = { error: jest.fn() } as any;
      expect(() => new HermesErrorBoundary({ children: 'test', logger: mockLogger })).not.toThrow();
    });
  });

  describe('Framework-specific Utilities', () => {
    test('should create child logger for components', () => {
      const childLogger = logger.createChild({ component: 'TestComponent' });
      
      childLogger.info('Component message');

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            component: 'TestComponent'
          })
        })
      );
    });

    test('should handle component context merging', () => {
      logger.setContext({ global: 'value' });
      const childLogger = logger.createChild({ component: 'TestComponent' });
      
      childLogger.info('Message', { local: 'data' });

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          context: {
            global: 'value',
            component: 'TestComponent',
            local: 'data'
          }
        })
      );
    });
  });
});