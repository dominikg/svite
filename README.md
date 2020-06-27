# svite <img width=36 alt="svite-logo" src="svite-logo.svg" style="vertical-align: middle; float: left;">

[svelte](https://svelte.dev) + [vite](https://github.com/vitejs/vite#readme) = sweet

## features

- read svelte configruation with [cosmiconfig](https://github.com/davidtheclark/cosmiconfig#readme)
- svelte preprocessor support
- hot module reloading thanks to [svelte-hmr](https://github.com/rixo/svelte-hmr#readme)
- drop-in installation as vite plugin

# quickstart

```shell script
npx degit dominikg/svite/examples/minimal my-first-svite-project
cd my-first-svite-project
npm install
npm run dev # starts dev-server with hot-module-reloading
npm run build # builds to /dist
```

# usage

## installation

Install svite and vite as a dev dependency

```shell script
npm install -D svite vite
```

Add as plugin to `vite.config.js`

```js
const svite = require('svite');
module.exports = {
  plugins: [svite()],
};
```

## run

just use regular `vite` or `vite build` commands

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

## svite options

you can pass options to svite via vite.config.jd

```js
const svite = require('svite');
const sviteConfig = {
  hot: true, // boolean or options object for svelte-hmr
  useTransformCache: true, // boolean
  svelte: {}, // options for rollup-plugin-svelte
};
module.exports = {
  plugins: [svite(sviteConfig)],
};
```

### hot

- type: boolean | object
  - true: use default svelte-hmr config.
  - false: disable svelte-hmr (warning, not tested!)
  - object: use as svelte-hmr config. see [svelte-hmr](https://github.com/rixo/svelte-hmr#readme)
- default: true

### useTransformCache

- type: boolean
  - true: cache results of svelte compiler and reuse them for unmodified files
  - false: rerun compiler every time
- default: true

### svelte

- type: object
  - rollup-plugin-svelte options. overrides values read from svelte config file
- default: not set

## check out the examples

### [minimal](/examples/minimal)

as barebones as it gets, just an essential App.svelte

### [postcss-tailwind](/examples/postcss-tailwind)

postcss and [tailwindcss](https://tailwindcss.com)

### [routify-mdsvex](/examples/routify-mdsvex)

[routify](https://routify.dev) with support for [mdsvex](https://mdsvex.com)

## limitations

- this is a very early version, expect things to break, hard.
- vite options like --ssr or --sourcemap
- dev mode with externalized css

# TODO

- more features

  - vite options

# Credits

- [rixo](https://github.com/rixo) - without svelte-hmr and your support this would not have been possible
- [vite-plugin-svelte](https://github.com/intrnl/vite-plugin-svelte) - initial inspiration
