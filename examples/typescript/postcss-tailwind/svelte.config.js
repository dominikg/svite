const sveltePreprocess = require('svelte-preprocess');
module.exports = {
  preprocess: sveltePreprocess({
    defaults: {
      script: 'typescript',
      style: 'postcss',
    },
    typescript: true,
    postcss: true,
    // disable preprocessors not in use
    babel: false,
    coffeescript: false,
    globalStyle: false,
    less: false,
    pug: false,
    replace: false,
    sass: false,
    scss: false,
    stylus: false,
  }),
};
