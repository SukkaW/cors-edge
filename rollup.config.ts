import { swc } from 'rollup-plugin-swc3';
import { dts } from 'rollup-plugin-dts';
import { defineConfig } from 'rollup';
import type { OutputChunk } from 'rollup';
import { bytes } from 'xbits';

export default defineConfig([{
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.cjs',
      format: 'cjs',
      compact: true
    },
    {
      file: 'dist/index.mjs',
      format: 'esm',
      compact: true
    }
  ],
  plugins: [
    swc({
      minify: true,
      jsc: {
        minify: {
          mangle: {
            topLevel: true
          },
          compress: {
            ecma: 2020,
            hoist_funs: true,
            inline: 0,
            keep_fargs: false,
            passes: 3,
            toplevel: true,
            unsafe_arrows: true,
            unsafe_symbols: true,
            unsafe_methods: true,
            unsafe_regexp: true
          },
          module: true
        }
      }
    }),
    {
      name: 'rollup:simple-size',
      generateBundle(options, bundle) {
        if (options.file) {
          const asset = options.file.split('/').pop()!;
          const size = bytes((bundle[asset] as OutputChunk).code.length);
          console.log(`Created bundle ${asset}: ${size}`);
        } else {
          console.error('No output file specified!');
        }
      }
    }
  ]
}, {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.d.ts',
    format: 'es'
  },
  plugins: [dts()]
}]);
