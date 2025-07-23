import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

const createConfig = (input, name, external = []) => ({
  input,
  output: [
    {
      file: `dist/${name}.js`,
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: `dist/${name}.esm.js`,
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    typescript({
      tsconfig: './tsconfig.json',
    }),
  ],
  external,
});

export default [
  createConfig('src/index.ts', 'index', ['@sentry/browser']),
  createConfig('src/react.ts', 'react', ['react', '@sentry/browser']),
  createConfig('src/vue.ts', 'vue', ['vue', '@sentry/browser']),
  createConfig('src/angular.ts', 'angular', ['@angular/core', '@angular/common/http', '@angular/router', '@sentry/browser']),
];