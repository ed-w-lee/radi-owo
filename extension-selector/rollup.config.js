// Use rollup for generate content script since it doesn't support modules
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

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
      file: 'src/content_scripts/build_content.js',
      strict: false, // Firefox WebRTC adapter has problems
      ...commonOutput,
    },
    ...commonExternal,
  },
  {
    input: 'src/background/background.ts',
    output: {
      file: 'src/background/build_background.js',
      ...commonOutput,
    },
    ...commonExternal,
  },
  {
    input: 'src/popup/main.ts',
    output: {
      file: 'src/popup/build_popup.js',
      ...commonOutput,
    },
    ...commonExternal,
  },
];
