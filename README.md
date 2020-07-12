<h1><img width=24 alt="svite-logo" src="svite-logo.svg" style="vertical-align: middle">&nbsp;svite&nbsp;<img width=24 alt="svite-logo" src="svite-logo.svg" style="vertical-align: middle"></h1>

![svelte+vite=sweet](https://user-images.githubusercontent.com/611613/86400551-18cffc00-bca9-11ea-81cd-fd0dcd0ad129.gif)

Every change in that gif is a separate hot module reload - seriously - [build it yourself](https://github.com/dominikg/svite/issues/6)

## features

- reads svelte configuration from `svelte.config.js`
- svelte preprocessor support
- svelte dependency optimization in dev
- svelte compiler result caching in dev
- hot module reloading thanks to [svelte-hmr](https://github.com/rixo/svelte-hmr#readme)
- logging with configurable level
- drop-in installation as vite plugin

# quickstart

```shell script
npx svite create my-first-svite-project
cd my-first-svite-project
npm run dev # starts dev-server with hot-module-reloading
npm run build # builds to /dist
```

# usage

## installation

Install svite and vite as a dev dependency

```shell script
npm install -D svite vite
```

## project setup

Vite requires an index.html file at project root that serves as entry point. see [example](/examples/minimal/index.html)

## run

Svite has its own cli that wraps vite. It does not require a vite.config.js by default.

Simply set it up in scripts of package.json

```json
{
  "scripts": {
    "dev": "svite",
    "build": "svite build"
  }
}
```

# Advanced usage

# svite cli

most of vite cli options can also be passed to svite.

## commands

### create

Create a new svite project from a template.

```
Usage: svite create [options] [targetDir]

create a new project. If you do not specify targetDir, "./svite-<template>" will be used

Options:
  -t, --template [string]  template for new project. ["minimal","routify-mdsvex","postcss-tailwind","svelte-preprocess-auto"] (default: "minimal")
  -f, --force              force operation even if targetDir exists and is not empty (default: false)
  -c, --cache              cache template for later use (default: false)
  -d, --debug              more verbose logging (default: false)
  -si, --skip-install      skip npm install (default: false)
  -sg, --skip-git          skit git init (default: false)
  -sc, --skip-commit       skit initial commit (default: false)
```

### dev

Start a dev server with `svite` or `svite dev`

```
Usage: svite dev [options]

Options:
  -d,  --debug [boolean|string]   enable debug output. you can use true for "vite:*,svite:*" or supply your own patterns. Separate patterns with , start with - to filter. eg: "foo:*,-foo:bar"  (default: false)
  -c,  --config [string]          use specified vite config file
  -p,  --port [port]              port to use for serve (default: 3000)
  -sw, --serviceWorker [boolean]  enable service worker caching (default: false)
  -o,  --open [boolean]           open browser on start
```

### build

Bundle for production with `svite build`

```
Usage: svite build [options]

Options:
  -d, --debug [boolean|string]               enable debug output. you can use true for "vite:*,svite:*" or supply your own patterns. Separate patterns with , start with - to filter. eg: "foo:*,-foo:bar"  (default: false)
  -c, --config [string]                      use specified vite config file
  -m, --mode [string]                        specify env mode (default: "production")
  --base [string]                            public base path for build (default: "/")
  --outDir [string]                          output directory for build (default: "dist")
  --assetsDir [string]                       directory under outDir to place assets in (default: "_assets")
  --assetsInlineLimit [number]               static asset base64 inline threshold in bytes (default: 4096)
  --sourcemap [boolean]                      output source maps for build (default: false)
  --minify [boolean | "terser" | "esbuild"]  enable/disable minification, or specify minifier to use. (default: "terser")
  --ssr [boolean]                            build for server-side rendering

```

### optimize

Run vite optimizer. `svite dev` runs this automatically by default. Sometimes it can be helpful to run it manually to force updates to optimized dependencies.

```
Usage: svite optimize [options]

run vite optimizer

Options:
  -d, --debug [boolean|string]  enable debug output. you can use true for "vite:*,svite:*" or supply your own patterns. Separate patterns with , start with - to filter. eg: "foo:*,-foo:bar"  (default: false)
  -c, --config [string]         use specified vite config file
  -f, --force                   force optimize even if hash is equal
```

## svite options

you can pass additional options to svite via vite.config.js

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

| option                    | type                      | default        | values                                                                                                                                                                |
| ------------------------- | ------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **hot**<br><br>           | `boolean`<br>`object`<br> | `true`<br><br> | &bull;&nbsp;`true` use default svelte-hmr config<br>&bull;&nbsp;`false` disable svelte-hmr<br>&bull;&nbsp;`object` custom svelte-hmr config                           |
| **useTransformCache**<br> | `boolean`<br>             | `true`<br>     | &bull;&nbsp;`true` enable transform cache<br>&bull;&nbsp;`false` disable transform cache                                                                              |
| **logLevel**              | `string`                  | `'info'`       | &bull;&nbsp;`'debug'` &bull;&nbsp;`'info'` &bull;&nbsp;`'warn'` &bull;&nbsp;`'error'` &bull;&nbsp;`'silent'`. cli 'debug' flag automatically sets logLevel to 'debug' |
| **svelte**<br>            | `object`<br>              | `not set`<br>  | &bull;&nbsp;`object` rollup-plugin-svelte config object                                                                                                               |

### hot

Only change this option if you have to. See [svelte-hmr](https://github.com/rixo/svelte-hmr#readme) for more Information

### useTransformCache

Improves performance for reloads.

When a reload request hits the dev server, vite runs transforms again. this option caches the result of the last transform and reuses it if the file was not modified. Uses more ram, less cpu and is a bit faster.

### logLevel

Set this to `'debug'` if you want to see more output, use `'warn'`, `'error'` or `'silent'` for less.
This only applies to svites own logging. Logging of vite remains unaffected.
You can use `--debug` cli option to control vite debug output

### svelte

use this option if you don't want to use `svelte.config.js` or need a quick override.

## check out the examples

### [minimal](/examples/minimal)

as barebones as it gets, just an essential App.svelte

### [postcss-tailwind](/examples/postcss-tailwind)

postcss and [tailwindcss](https://tailwindcss.com)

### [routify-mdsvex](/examples/routify-mdsvex)

[routify](https://routify.dev) with support for [mdsvex](https://mdsvex.com)

### [svelte-preprocess-auto](/examples/svelte-preprocess-auto)

typescript and svelte-preprocess in automatic mode. This is heavily based on the regular svelte-preprocess example

# limitations

This is an early version, some things may not work as expected. Please report findings.

# Got a question? / Need help?

Join [svite discord](https://discord.gg/nzgMZJD)

# Credits

- [svelte](https://svelte.dev) and [vite](https://github.com/vitejs/vite#readme) obviously
- [rixo](https://github.com/rixo) - without svelte-hmr and your support this would not have been possible
- [vite-plugin-svelte](https://github.com/intrnl/vite-plugin-svelte) - initial inspiration
