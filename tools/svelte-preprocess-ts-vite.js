const { transform } = require('vite/dist/node/esbuildService');

module.exports = {
  script: async ({ content, attributes, filename }) => {
    if (attributes.lang !== 'ts') {
      return { code: content };
    }

    return await transform(content, filename, {
      loader: 'ts',
    });
  },
};
