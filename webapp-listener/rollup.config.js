import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-css-only';

const env = process.env.BUILD;
if (env === undefined) {
  throw new Error('failed to find BUILD environment');
}
const production = env === 'production';

export default [
  {
    input: 'src/components/App.svelte',
    output: {
      sourcemap: false,
      format: 'cjs',
      name: 'app',
      file: 'public/build/App.js',
    },
    plugins: [
      svelte({
        preprocess: sveltePreprocess(),
        compilerOptions: {
          generate: 'ssr',
        }
      }),
      css({ output: 'bundle.css' }),
      replace({
        __MYENV__: `'${env}'`,
      }),
      resolve(),
      commonjs(),
      typescript(),
      production && terser(),
    ],
  },
  {
    input: 'src/main.ts',
    output: {
      sourcemap: true,
      format: 'iife',
      name: 'app',
      file: 'public/build/bundle.js',
    },
    plugins: [
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

      // watch the `public` directory and refresh the
      // browser on changes when not in production
      !production && livereload({ watch: 'public/App.js', delay: 200 }),

      // if we're building for production (npm run build
      // instead of npm run dev), minify
      production && terser(),
    ],
    watch: {
      clearscreen: false,
    },
  },
];
