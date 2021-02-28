import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';
import css from 'rollup-plugin-css-only';
import path from 'path';

const env = process.env.BUILD;
if (env === undefined) {
  throw new Error('failed to find BUILD environment');
}
const production = env === 'production';

export default [
  {
    input: 'src/main.ts',
    output: {
      sourcemap: true,
      format: 'cjs',
      name: 'app',
      file: 'public/build/bundle.js',
    },
    plugins: [
      alias({
        entries: [
          {
            find: '@src',
            replacement: path.resolve(__dirname, 'src'),
          }
        ]
      }),
      svelte({
        preprocess: sveltePreprocess(),
        compilerOptions: {
          // enable run-time checks when not in production
          dev: !production,
          hydratable: true,
        },
      }),
      // we'll extract any component CSS out into
      // a separate file - better for performance
      css({ output: 'bundle.css' }),

      // If you have external dependencies installed from
      // npm, you'll most likely need these plugins. In
      // some cases you'll need additional configuration -
      // consult the documentation for details:
      // https://github.com/rollup/plugins/tree/master/packages/commonjs
      replace({
        __MYENV__: `'${env}'`,
      }),
      resolve({
        browser: true,
        dedupe: ['svelte'],
      }),
      commonjs(),
      typescript({
        sourceMap: !production,
        inlineSources: !production,
      }),

      // if we're building for production (npm run build
      // instead of npm run dev), minify
      production && terser(),
    ],
    watch: {
      clearscreen: true,
    },
  },
];
