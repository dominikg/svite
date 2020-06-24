const chalk = require('chalk');
const prefix = '[svite]';

const levels = ['debug', 'info', 'warn', 'error', 'silent'];

const loggers = {
  debug: {
    color: (str) => str,
    log: console.debug,
    enabled: false,
  },
  info: {
    color: chalk.cyan,
    log: console.log,
    enabled: true,
  },
  warn: {
    color: chalk.yellow,
    log: console.warn,
    enabled: true,
  },
  error: {
    color: chalk.red,
    log: console.error,
    enabled: true,
  },
  silent: {
    enabled: false,
  },
};

let _level = 'info';
function setLevel(level) {
  if (level === _level) {
    return;
  }
  const levelIndex = levels.indexOf(level);
  if (levelIndex > -1) {
    _level = level;
    for (let i = 0; i < levels.length; i++) {
      loggers[levels[i]].enabled = i >= levelIndex;
    }
  } else {
    _log(loggers.error, `invalid log level: ${level} `);
  }
}

function _log(logger, message, payload) {
  if (!logger.enabled) {
    return;
  }
  message = logger.color(`${prefix} ${message}`);
  if (payload || process.env.NODE_ENV === 'production') {
    message += '\n'; // linebreak required in production to prevent vite spinner killing the log
  }

  if (payload) {
    logger.log(message, payload);
  } else {
    logger.log(message);
  }
}

function createLogger(level) {
  const logger = loggers[level];
  const logFn = _log.bind(null, logger);
  Object.defineProperty(logFn, 'enabled', {
    get() {
      return logger.enabled;
    },
  });
  return logFn;
}

module.exports = {
  debug: createLogger('debug'),
  info: createLogger('info'),
  warn: createLogger('warn'),
  error: createLogger('error'),
  setLevel,
};
