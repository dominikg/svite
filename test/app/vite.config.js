const svite = require('../../../svite');
module.exports = {
  plugins: [svite()],
  optimizeDeps: {
    include: ['@dependency/dependency'],
  },
};
