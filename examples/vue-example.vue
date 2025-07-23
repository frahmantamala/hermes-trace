<template>
  <div class="vue-example">
    <header>
      <h1>HermesTrace Vue Example</h1>
    </header>
    <main>
      <div>
        <h3>Vue Component</h3>
        <button @click="handleClick">Log Info</button>
        <button @click="handleError">Trigger Error</button>
        <button @click="handleWarning">Log Warning</button>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { 
  createLogger, 
  ConsoleTransport, 
  LokiTransport, 
  DatadogTransport,
  LogLevel,
  createVuePlugin 
} from 'hermes-trace';

const logger = createLogger({
  level: LogLevel.DEBUG,
  transports: [
    new ConsoleTransport({ level: LogLevel.DEBUG }),
    new LokiTransport({
      url: 'http://localhost:3100',
      labels: { service: 'my-vue-app' }
    }),
    new DatadogTransport({
      apiKey: 'your-datadog-api-key',
      service: 'my-vue-app',
      env: 'production'
    })
  ],
  context: { userId: '12345' }
});

// Install the Vue plugin globally
// app.use(createVuePlugin(logger));

export default defineComponent({
  name: 'VueExample',
  created() {
    this.$hermesLogger.info('Vue component created', { 
      component: 'VueExample',
      framework: 'Vue',
      version: '3.x' 
    });
  },
  methods: {
    handleClick() {
      this.$logInfo('Button clicked', { 
        action: 'click', 
        timestamp: Date.now() 
      });
    },
    
    handleError() {
      try {
        throw new Error('Intentional error for testing');
      } catch (error) {
        this.$logError('Error in button handler', error, { 
          action: 'error-test' 
        });
      }
    },
    
    handleWarning() {
      this.$logWarn('This is a warning message', { 
        action: 'warning-test',
        level: 'warn' 
      });
    }
  }
});
</script>

<style scoped>
.vue-example {
  font-family: Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

button {
  margin: 5px;
  padding: 10px 15px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #369870;
}
</style>