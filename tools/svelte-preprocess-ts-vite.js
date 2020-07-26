const log = require('./log');
const url = require('url');
const { startService } = require('esbuild');

// lazy start the service
let _service;

const ensureService = async () => {
  if (!_service) {
    _service = await startService();
  }
  return _service;
};

const stopService = () => {
  _service && _service.stop();
  _service = undefined;
};

const sourceMapRE = /\/\/# sourceMappingURL.*/;

const esbuildTransform = async (src, requestUrl) => {
  const service = await ensureService();
  const file = url.parse(requestUrl).path;
  const esBuildOptions = {
    loader: 'ts',
    sourcemap: true,
    // ensure source file name contains full query
    sourcefile: requestUrl,
    // https://github.com/vitejs/vite/issues/565#issuecomment-661345890
    // force esbuild to transpile optional chaining but allow import.meta
    // until terser can support optional chaining in minification
    target: 'chrome79',
  };
  try {
    // TODO esbuild removes svelte imports. find a way to protect them
    const result = await service.transform(src, esBuildOptions);
    if (result.warnings.length) {
      log.warn(`warnings while transforming ${file} with esbuild`);
      const lines = src.split(/\r?\n/g);
      result.warnings.forEach((m) => printMessage(m, lines));
    }

    let code = (result.js || '').replace(sourceMapRE, '');

    return {
      code,
      map: result.jsSourceMap,
    };
  } catch (e) {
    if (e.errors) {
      const lines = src.split(/\r?\n/g);
      e.errors.forEach((m) => printMessage(m, lines));
    } else {
      log.error('error', e);
    }
    return {
      code: '',
      map: undefined,
    };
  }
};

function printMessage(m, lines) {
  log.error(m.text);
  if (m.location) {
    const line = Number(m.location.line);
    const column = Number(m.location.column);
    log.error(`(${line}:${column})`, lines[line]);
  }
}

module.exports = {
  script: async ({ content, attributes, filename }) => {
    if (attributes.lang !== 'ts' && attributes.lang !== 'typescript') {
      return { code: content };
    }
    return await esbuildTransform(content, filename);
  },
  stopService,
};
