const { postcss, typescript } = require('svelte-preprocess');
module.exports = {
  preprocess: [typescript(), postcss()],
};
