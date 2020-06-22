const chalk = require('chalk');
const prefix = '[svite]';
const colors = {
  log: chalk.cyan,
  warn: chalk.yellow,
  error: chalk.red,
};

function _log(level, message, payload) {
  message = colors[level](`${prefix} ${message}`);
  if (payload || process.env.NODE_ENV === 'production') {
    message += '\n'; // linebreak required in production to prevent vite spinner killing the log
  }
  if (payload) {
    console[level](message, payload);
  } else {
    console[level](message);
  }
}

module.exports = {
  log: (message, payload) => _log('log', message, payload),
  warn: (message, payload) => _log('warn', message, payload),
  error: (message, payload) => _log('error', message, payload),
};
