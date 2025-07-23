import { HermesTrace } from '../logger';
import { FrameworkIntegration } from '../types';

export class VueIntegration implements FrameworkIntegration {
  private logger?: HermesTrace;
  private app?: any;

  install(logger: HermesTrace): void {
    this.logger = logger;
  }

  public installVue2(Vue: any): void {
    if (!this.logger) return;

    Vue.config.errorHandler = (error: Error, vm: any, info: string) => {
      this.logger!.error('Vue 2 error caught', error, {
        componentName: vm?.$options?.name || 'Unknown',
        componentTag: vm?.$vnode?.tag,
        info,
        propsData: vm?.$options?.propsData,
      }, ['vue2-error']);
    };

    Vue.mixin({
      created() {
        const componentName = this.$options.name || 'AnonymousComponent';
        this.$hermesLogger = this.logger?.createChild({
          component: componentName,
          vue: '2.x',
        });
      },
      
      beforeDestroy() {
        if (this.$hermesLogger) {
          const componentName = this.$options.name || 'AnonymousComponent';
          this.$hermesLogger.debug(`Component ${componentName} destroyed`, {
            component: componentName,
          }, ['vue2-lifecycle']);
        }
      },
    });

    Vue.prototype.$logInfo = function(message: string, context?: Record<string, any>) {
      const componentName = this.$options.name || 'AnonymousComponent';
      this.logger?.info(message, { ...context, component: componentName }, ['vue2-log']);
    };

    Vue.prototype.$logError = function(message: string, error?: Error, context?: Record<string, any>) {
      const componentName = this.$options.name || 'AnonymousComponent';
      this.logger?.error(message, error, { ...context, component: componentName }, ['vue2-error']);
    };

    Vue.prototype.$logWarn = function(message: string, context?: Record<string, any>) {
      const componentName = this.$options.name || 'AnonymousComponent';
      this.logger?.warn(message, { ...context, component: componentName }, ['vue2-warn']);
    };
  }

  public installVue3(app: any): void {
    if (!this.logger) return;
    
    this.app = app;

    app.config.errorHandler = (error: Error, instance: any, info: string) => {
      this.logger!.error('Vue 3 error caught', error, {
        componentName: instance?.type?.name || 'Unknown',
        info,
        props: instance?.props,
      }, ['vue3-error']);
    };

    app.config.globalProperties.$hermesLogger = this.logger;
    
    app.config.globalProperties.$logInfo = function(message: string, context?: Record<string, any>) {
      const componentName = this?.$?.type?.name || 'AnonymousComponent';
      this.logger?.info(message, { ...context, component: componentName }, ['vue3-log']);
    };

    app.config.globalProperties.$logError = function(message: string, error?: Error, context?: Record<string, any>) {
      const componentName = this?.$?.type?.name || 'AnonymousComponent';
      this.logger?.error(message, error, { ...context, component: componentName }, ['vue3-error']);
    };

    app.config.globalProperties.$logWarn = function(message: string, context?: Record<string, any>) {
      const componentName = this?.$?.type?.name || 'AnonymousComponent';
      this.logger?.warn(message, { ...context, component: componentName }, ['vue3-warn']);
    };

    app.mixin({
      created() {
        const componentName = this.$?.type?.name || 'AnonymousComponent';
        this.logger?.debug(`Component ${componentName} created`, {
          component: componentName,
        }, ['vue3-lifecycle']);
      },
      
      beforeUnmount() {
        const componentName = this.$?.type?.name || 'AnonymousComponent';
        this.logger?.debug(`Component ${componentName} before unmount`, {
          component: componentName,
        }, ['vue3-lifecycle']);
      },
    });
  }

  uninstall(): void {
    if (this.app) {
      delete this.app.config.globalProperties.$hermesLogger;
      delete this.app.config.globalProperties.$logInfo;
      delete this.app.config.globalProperties.$logError;
      delete this.app.config.globalProperties.$logWarn;
    }
  }
}

export const createVuePlugin = (logger: HermesTrace) => {
  return {
    install(app: any) {
      const integration = new VueIntegration();
      integration.install(logger);
      integration.installVue3(app);
    },
  };
};

export const useHermesLogger = () => {
  if (typeof getCurrentInstance === 'function') {
    const instance = getCurrentInstance();
    return instance?.appContext?.config?.globalProperties?.$hermesLogger;
  }
  return null;
};

declare let getCurrentInstance: () => any;