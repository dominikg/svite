# svite

svelte integration for vite

## features

- read svelte configruation with cosmiconfig
- svelte preprocessor support
- hot module reloading thanks to svelte-hmr
- drop-in installation as vite plugin

# usage

## install
`npm install -D svite`

Add as plugin to `vite.config.js`
```js 
const svite = require('svite');
module.exports = {
  plugins:[
    svite()
  ]
}
```

## use

just use regular `vite` or `vite build` commands

## check out the examples
### [minimal](/examples/minimal)
as barebones as it gets, just an essential App.svelte 


## limitations

- this is a very early version, expect things to break, hard.
- vite  options like --ssr or --sourcemaps
- dev mode with externalized css

# Credits
@rixo - without svelte-hmr and your support this would not have been possible


# TODO
- more examples
  - preprocessor support (postcss with tailwind)
  - config 
  - routify
  
- more features  
  - vite options


