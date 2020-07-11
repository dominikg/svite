const chalk = require('chalk');
const prefix = '[svite]';
const debug = require('debug');
const levels = ['debug', 'info', 'warn', 'error', 'silent'];

const loggers = {
  debug: {
    log: debug('svite:'),
    enabled: false,
    isDebug: true,
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

let _viteLogOverwriteProtection = false;
function setViteLogOverwriteProtection(viteLogOverwriteProtection) {
  _viteLogOverwriteProtection = !!viteLogOverwriteProtection;
}

function _log(logger, message, payload) {
  if (!logger.enabled) {
    return;
  }
  if (logger.isDebug) {
    payload !== undefined ? logger.log(message, payload) : logger.log(message);
  } else {
    logger.log(logger.color(`${prefix} ${message}`));
    if (payload) {
      logger.log(payload);
    }
  }
  if (_viteLogOverwriteProtection) {
    logger.log('');
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
  setViteLogOverwriteProtection,
};
