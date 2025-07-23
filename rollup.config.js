import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'HermesTrace',
      sourcemap: true,
      globals: {
        'react': 'React',
        '@sentry/browser': 'Sentry'
      }
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
  external: ['@sentry/browser', 'react'],
};