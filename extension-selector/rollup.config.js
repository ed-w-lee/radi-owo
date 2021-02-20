// Use rollup for generate content script since it doesn't support modules
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';

const commonOutput = {
  format: 'iife',
  banner: '/* eslint-disable */\n'
    + '/* Generated with Rollup from stream_manager.js */',
};

const env = process.env.BUILD;
if (env === undefined) {
  throw Error('undefined build environment');
}

const commonExternal = {
  plugins: [
    replace({
      'process.env.ENV': `'${env}'`,
    }),
    nodeResolve(),
    commonjs(),
    typescript(),
  ],
};

export default [
  {
    input: 'src/content_scripts/stream_manager.ts',
    output: {
      file: 'publish/build/content.js',
      strict: false, // Firefox WebRTC adapter has problems
      ...commonOutput,
    },
    ...commonExternal,
  },
  {
    input: 'src/background/background.ts',
    output: {
      file: 'publish/build/background.js',
      ...commonOutput,
    },
    ...commonExternal,
    plugins: [
      ...commonExternal.plugins,
      copy({
        targets: [
          { src: 'src/background/background.html', dest: 'publish/build' },
        ],
      }),
    ],
  },
  {
    input: 'src/popup/main.ts',
    output: {
      file: 'publish/build/popup.js',
      ...commonOutput,
    },
    ...commonExternal,
    plugins: [
      ...commonExternal.plugins,
      copy({
        targets: [
          { src: ['src/popup/popup.html', 'src/popup/popup.css'], dest: 'publish/build' },
          {
            src: 'manifest.json',
            dest: 'publish/',
            rename: 'manifest.json',
            transform: (contents) => contents.toString().replace('__ORIGIN_REPLACE_THIS__', () => {
              switch (env) {
                case 'localdev':
                  return '*://localhost/*';
                case 'remotedev':
                  return '*://192.168.1.128/*';
                case 'production':
                  return '*://radiowo.edwlee.dev/*';
                default:
                  break;
              }
              return `__UNKNOWN_ENV__${env}__`;
            }),
          },
        ],
      }),
    ],
  },
];
