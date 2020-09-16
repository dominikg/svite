/* eslint-env node,jest */
const path = require('path');
const { cleanDir } = require('./utils');
module.exports = async () => {
  await cleanDir(path.join(__dirname, 'temp'));
};
