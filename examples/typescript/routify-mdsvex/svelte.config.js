const { mdsvex } = require('mdsvex');
module.exports = {
  extensions: ['.svelte', '.svx'],
  preprocess: [mdsvex()],
};
