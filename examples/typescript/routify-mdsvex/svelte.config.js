const path = require('path');
const { mdsvex } = require('mdsvex');
const sveltePreprocess = require('svelte-preprocess');
module.exports = {
  extensions: ['.svelte', '.svx'],
  preprocess: [
    sveltePreprocess({
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
    mdsvex({
      layout: path.join(__dirname, 'src', 'layouts', 'MdsvexLayout.svelte'),
    }),
  ],
};
