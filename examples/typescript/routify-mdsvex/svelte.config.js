const { mdsvex } = require('mdsvex');
const { typescript } = require('svelte-preprocess');
module.exports = {
  extensions: ['.svelte', '.svx'],
  preprocess: [typescript(), mdsvex()],
};
