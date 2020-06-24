const { mdsvex } = require('mdsvex');
module.exports = {
  hydratable: false,
  extensions: ['.svelte', '.svx'],
  preprocess: [mdsvex()],
};
