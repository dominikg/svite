const smelteTailwindCfg = require('smelte/tailwind.config');
const smelteExtractor = require('smelte/src/utils/css-extractor');
module.exports = smelteTailwindCfg({
  purge: process.env.NODE_ENV === 'production' && {
    content: ['./src/**/*.svelte', './src/**/*.html', './src/**/*.css', './index.html', './node_modules/smelte/src/**/*.svelte'],
    options: {
      whitelistPatterns: [
        /svelte-/,
        // for JS ripple
        /ripple/,
        // date picker
        /w-.\/7/,
      ],
      defaultExtractor: (content) => {
        const regExp = new RegExp(/[A-Za-z0-9-_:/]+/g);
        const matchedTokens = [];
        let match = regExp.exec(content);
        while (match) {
          if (match[0].startsWith('class:')) {
            matchedTokens.push(match[0].substring(6));
          } else {
            matchedTokens.push(match[0]);
          }
          match = regExp.exec(content);
        }
        const smelteTokens = smelteExtractor(content);
        return [...new Set([...matchedTokens, ...smelteTokens])];
      },
    },
  },
});
