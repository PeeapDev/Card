import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default [
  // CommonJS build (for Node.js)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      exports: 'named',
    },
    plugins: [
      typescript({ tsconfig: './tsconfig.json' }),
    ],
  },
  // ESM build (for modern bundlers)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
    },
    plugins: [
      typescript({ tsconfig: './tsconfig.json' }),
    ],
  },
  // UMD build (for browsers via script tag)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/peeap-chat.min.js',
      format: 'umd',
      name: 'PeeapChat',
      exports: 'named',
    },
    plugins: [
      typescript({ tsconfig: './tsconfig.json' }),
      terser(),
    ],
  },
];
