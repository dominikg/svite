const smelteTailwindCfg = require('smelte/tailwind.config');
module.exports = smelteTailwindCfg({
  // unfortunately smelte is implemented in a way that makes it impossible to automatically purge
  // without removing classes required at runtime
  // feel free to enable this on your own risk. check postcss-tailwind example, smelte rollup plugin/config and purgecss docs
  // good luck and please share if you get it working
  purge: false,
});
