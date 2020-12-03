// Use rollup for generate content script since it doesn't support modules
export default {
    input: 'src/content_scripts/stream_manager.js',
    output: {
        file: 'src/content_scripts/bundle.js',
        format: 'iife',
        banner: '/* Generated with Rollup from stream_manager.js */',
    }
};
