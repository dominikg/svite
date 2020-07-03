const preprocess = require('svelte-preprocess');
module.exports = {
  preprocess: preprocess({
    typescript: {
      // skips type checking
      transpileOnly: true,
    },
  })
}
