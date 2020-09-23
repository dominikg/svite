/* eslint-env node,jest */
const path = require('path');
const { cleanDir, killProcessTreeOnSignals } = require('./utils');
module.exports = async () => {
  killProcessTreeOnSignals();
  await cleanDir(path.join(__dirname, 'temp'));
};
