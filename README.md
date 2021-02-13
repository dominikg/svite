<h1><img width=24 alt="svite-logo" src="svite-logo.svg" style="vertical-align: middle">&nbsp;svite&nbsp;<img width=24 alt="svite-logo" src="svite-logo.svg" style="vertical-align: middle"></h1>

![svelte+vite=sweet](https://user-images.githubusercontent.com/611613/86400551-18cffc00-bca9-11ea-81cd-fd0dcd0ad129.gif)

Every change in that gif is a separate hot module reload - seriously - [build it yourself](https://github.com/dominikg/svite/issues/6)

## DEPRECATION WARNING - svite@0.8.1

- svite@0.8.1 still uses vite 1.x which has been deprecated
- There isn't going to be another 0.8.x release based on vite1
- a new version with vite2 is being worked on, no ETA or promises at this point

that being said, 0.8.1 still works, happy hot module reloading.

## features

- reads svelte configuration from `svelte.config.js`
- svelte preprocessor support
- svelte dependency optimization in dev
- svelte compiler result caching in dev
- hot module reloading thanks to [svelte-hmr](https://github.com/rixo/svelte-hmr#readme)
- logging with configurable level
- a cli with lots of options

# quickstart

```shell script
npx svite create my-first-svite-project
cd my-first-svite-project
npm run dev # starts dev-server with hot-module-reloading
npm run build # builds to /dist
```

# usage

## installation

Install svite as a dev dependency

```shell script
npm install -D svite
```

## project setup

Vite requires an index.html file at project root that serves as entry point.
In that index.html you need to reference the script that creates your svelte application.

see [example](/examples/minimal/index.html)

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
  -t, --template <string>         template for new project. ["minimal","routify-mdsvex","postcss-tailwind","svelte-preprocess-auto"] (default: "minimal")
  -ts, --typescript               enable typescript support for svelte !!!EXPERIMENTAL!!! (default: false)
  -pm, --packageManager <string>  which package manager to use. ["npm","pnpm","yarn","yarn2"] (default: "npm")
  -f, --force                     force operation even if targetDir exists and is not empty (default: false)
  -c, --cache                     cache template for later use (default: false)
  -d, --debug                     more verbose logging (default: false)
  -si, --skip-install             skip install (default: false)
  -sg, --skip-git                 skip git init (default: false)
  -sc, --skip-commit              skip initial commit (default: false)
  -h, --help                      display help for command
```

### dev

Start a dev server with `svite` or `svite dev`

```
Usage: svite dev [options]

Options:
  -d,  --debug [boolean|string]                 enable debug output. you can use true for "vite:*,svite:*" or supply your own patterns. Separate patterns with , start with - to filter. eg: "foo:*,-foo:bar"  (default: false)
  -r,  --root <string>                          use specified directory as root
  -c,  --config <string>                        use specified vite config file
  -ts, --typescript [boolean]                   enable typescript preprocessing in svelte !!!EXPERIMENTAL!!! (default: false)
  -m,  --mode <string>                          specify env mode eg. ["development","test","staging","production"] (default: "development")
  -p,  --port <port>                            port to use for serve (default: 3000)
  -o,  --open                                   open browser on start
  --useTransformCache [boolean]                 use transform cache for faster hmr (default: true)
  --hot [boolean]                               enable/disable hmr for svelte (default: true)
  --resolveSvelteField [boolean]                resolve via svelte field in package.json (default: true)
  --resolveSvelteExtensions [boolean]           resolve svelte extensions in modules !!!EXPERIMENTAL!!! (default: false)
  --resolveAbsoluteImportsInsideRoot [boolean]  resolve absolute imports if they end up being inside rootDir (mostly used in generated code) (default: true)
  -h, --help                                    display help for command
```

### build

Bundle for production with `svite build`

```
Usage: svite build [options]

Options:
  -d, --debug [boolean|string]               enable debug output. you can use true for "vite:*,svite:*" or supply your own patterns. Separate patterns with , start with - to filter. eg: "foo:*,-foo:bar"  (default: false)
  -r,  --root <string>                       use specified directory as root
  -c,  --config <string>                     use specified vite config file
  -ts, --typescript [boolean]                enable typescript preprocessing in svelte !!!EXPERIMENTAL!!! (default: false)
  -m,  --mode <string>                       specify env mode eg. ["development","test","staging","production"] (default: "production")
  --entry <string>                           entry point for the application (default: "index.html")
  --base <string>                            public base path for build (default: "/")
  --outDir <string>                          output directory for build (default: "dist")
  --assetsDir <string>                       directory under outDir to place assets in (default: "_assets")
  --assetsInlineLimit <number>               static asset base64 inline threshold in bytes (default: 4096)
  --sourcemap [boolean]                      output source maps for build (default: false)
  --minify [boolean | "terser" | "esbuild"]  enable/disable minification, or specify minifier to use. (default: "terser")
  --stats [boolean|string]                   generate bundle stats with rollup-plugin-visualizer. true, "json": stats.json, ["html" "treemap","sunburst","network"]: stats.html
  --ssr [boolean]                            build for server-side rendering
  -h, --help                                 display help for command
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

## custom vite.config.js

you can pass additional options to svite via vite.config.js

```js
const svite = require('svite');
const sviteConfig = {
  hot: true, // boolean or options object for svelte-hmr
  useTransformCache: false, // boolean
};
module.exports = {
  // if you provide a svite plugin here, svite cli will use it instead of initializing one for you
  plugins: [svite(sviteConfig)],
  // if you don't use svite cli, you should provide rollupDedupe option, otherwise you risk duplicate svelte instances and errors
  rollupDedupe: ['svelte/animate', 'svelte/easing', 'svelte/internal', 'svelte/motion', 'svelte/store', 'svelte/transition', 'svelte'],
};
```

| option                               | type                      | default        | values                                                                                                                                                                |
| ------------------------------------ | ------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **hot**<br><br>                      | `boolean`<br>`object`<br> | `true`<br><br> | &bull;&nbsp;`true` use default svelte-hmr config<br>&bull;&nbsp;`false` disable svelte-hmr<br>&bull;&nbsp;`object` custom svelte-hmr config                           |
| **useTransformCache**<br>            | `boolean`<br>             | `true`<br>     | &bull;&nbsp;`true` enable transform cache<br>&bull;&nbsp;`false` disable transform cache                                                                              |
| **logLevel**                         | `string`                  | `'info'`       | &bull;&nbsp;`'debug'` &bull;&nbsp;`'info'` &bull;&nbsp;`'warn'` &bull;&nbsp;`'error'` &bull;&nbsp;`'silent'`. cli 'debug' flag automatically sets logLevel to 'debug' |
| **typescript**                       | `boolean`                 | `false`        | &bull;&nbsp;`true` enable typescript preprocessing. !!!EXPERIMENTAL!!! &bull;&nbsp;`false` disable typescript preprocessing.                                          |
| **resolveSvelteField**               | `boolean`                 | `true`         | &bull;&nbsp;`true` resolve via svelte field in package.json &bull;&nbsp;`false` don't resolve via svelte field in package.json.                                       |
| **resolveSvelteExtensions**          | `boolean`                 | `false`        | &bull;&nbsp;`true` resolve svelte extensions. !!!EXPERIMENTAL!!! &bull;&nbsp;`false` don't resolve svelte extensions.                                                 |
| **resolveAbsoluteImportsInsideRoot** | `boolean`                 | `true`         | &bull;&nbsp;`true` resolve absolute imports in root dir &bull;&nbsp;`false` don't resolve absolute imports                                                            |

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

### typescript

!!! EXPERIMENTAL !!!

use this option if you want to use typescript inside svelte

This option requires you to set up tsconfig.json like this

```json
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules/*", "public/*"],
  "compilerOptions": {
    "module": "esnext",
    "types": ["svelte", "vite/dist/importMeta"]
  }
}
```

And typescript preprocessor in svelte.config.js

```js
const sveltePreprocess = require('svelte-preprocess');
module.exports = {
  preprocess: sveltePreprocess({
    typescript: true,
    // disable preprocessors not in use
    babel: false,
    coffeescript: false,
    globalStyle: false,
    less: false,
    postcss: false,
    pug: false,
    replace: false,
    sass: false,
    scss: false,
    stylus: false,
  }),
};
```

To use typescript in svelte files, add `lang="ts"` attribute to script tags

```
<script lang="ts">
    export let foo: string;
</script>
```

### resolveSvelteField

Svelte libraries use the svelte field as a way to allow `import Component from "library"` style imports. This option enables resolving these kinds of imports in vite.
If a library has different exports in svelte and main field of package.json, this option will break importing via main field as svelte field takes precedence.

### resolveSvelteExtensions

!!! EXPERIMENTAL !!!

Some extensions like .js, .ts can be omitted by default on imports. With this option enabled, all extensions of your svelte config can be omitted too.
So for `src/components/Button.svelte` you can use `import Button from "/src/components/Button"`

This option breaks if a dependency uses a .svelte file in package.json svelte field. e.g. svelte-spa-router.

### resolveAbsoluteImportsInsideRoot

With this option enabled, absolute imports into root directory are resolved correctly.
This is mainly useful for generated code that creates absolute paths like this
`import Foo from "/home/user/dev/project/src/Foo.svelte"`
One example are mdsvex layout imports.

## check out the examples

### [minimal](/examples/minimal)

as barebones as it gets, just an essential App.svelte

### [postcss-tailwind](/examples/postcss-tailwind)

postcss and [tailwindcss](https://tailwindcss.com)

### [routify-mdsvex](/examples/routify-mdsvex)

[routify](https://routify.dev) with support for [mdsvex](https://mdsvex.com)

### [svelte-preprocess-auto](/examples/svelte-preprocess-auto)

svelte-preprocess in automatic mode. This is heavily based on the regular svelte-preprocess example

### [typescript](/examples/typescript)

All of the above, but with typescript support

# limitations

This is an early version, some things may not work as expected. Please report findings.

## SSR not supported

There is a `--ssr` flag, but it doesn't work. [This feature is tracked in #22](https://github.com/dominikg/svite/issues/22).

## imports of commonjs modules don't work in `svite dev`

Support for commonjs modules in vite is limited. If you run into problems, try to add the dependency to vite optimizeDeps via vite.config.js

```js
modules.exports = {
  optimizeDeps: {
    include: ['my-commonjs-dep'],
  },
};
```

and always use deep imports `import {something} from 'my-commonjs-dep/deep/import/path'`

# Got a question? / Need help?

Join [svite discord](https://discord.gg/nzgMZJD)

# Credits

- [svelte](https://svelte.dev) and [vite](https://github.com/vitejs/vite#readme) obviously
- [rixo](https://github.com/rixo) - without svelte-hmr and your support this would not have been possible
- [vite-plugin-svelte](https://github.com/intrnl/vite-plugin-svelte) - initial inspiration
