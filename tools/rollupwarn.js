const log = require('./log');

module.exports = function rollupWarn(warning) {
  const isProduction = process.env.NODE_ENV === 'production';
  if (typeof warning === 'string') {
    warning = {
      message: warning,
    };
  }
  const { loc, start, end, filename, frame, message, code } = warning;
  if (!isProduction && code === 'css-unused-selector') {
    return; // ignore during dev
  }
  let logMessage;
  if (loc) {
    logMessage = `${loc.file}(${loc.line}:${loc.column}) ${message}`;
  } else if (filename && start) {
    logMessage = `${filename}(${start.line}:${start.column}) ${message}`;
    if (frame) {
      const line = frame.split('\n').find((line) => line.trim().startsWith(start.line));
      const lineNumberOffset = line.indexOf(': ') + 2;
      const startPos = lineNumberOffset + start.column;
      const endPos = end && end.line === start.line ? lineNumberOffset + end.column : undefined;
      const fragment = line.substring(startPos, endPos);
      logMessage += ` ${fragment}`;
    }
  } else {
    logMessage = message;
  }
  if (isProduction) {
    if (code === 'css-unused-selector') {
      log.error(logMessage); // do not include frame, it includes inline sourcemaps from postcss
    } else {
      log.error(logMessage, frame);
    }
  } else {
    log.warn(logMessage, frame);
  }
};
