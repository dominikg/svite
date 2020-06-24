const log = require('./log');

function extractOffender(frame, start, end) {
  const line = frame.split('\n').find((line) => line.trim().startsWith(start.line));
  const lineNumberOffset = line.indexOf(': ') + 2;
  const startPos = lineNumberOffset + start.column;
  const endPos = end && end.line === start.line ? lineNumberOffset + end.column : undefined;
  return !endPos || endPos > startPos ? line.substring(startPos, endPos) : '';
}
module.exports = function onwarn(warning) {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!log[isProduction ? 'error' : 'warn'].enabled) {
    return;
  }

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
  } else {
    logMessage = message;
  }
  if (isProduction) {
    if (code === 'css-unused-selector') {
      // do not include frame, it includes inline sourcemaps from postcss
      const offender = extractOffender(frame, start, end);
      log.warn(`${logMessage}${offender ? `: ${offender}` : ''}`);
    } else {
      log.error(logMessage, frame);
    }
  } else {
    log.warn(logMessage, frame);
  }
};
