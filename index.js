const path = require('path');
const rollupPluginSvelteHot = require('rollup-plugin-svelte-hot');
const { createFilter } = require('@rollup/pluginutils');
const log = require('./tools/log');
const LRU = require('lru-cache');
const svelteDeps = ['svelte/animate', 'svelte/easing', 'svelte/internal', 'svelte/motion', 'svelte/store', 'svelte/transition', 'svelte'];

const defaultOptions = {
  hot: true,
  useTransformCache: false,
  logLevel: 'info', // 'debug','info','warn','error'  ('silent' for no output)
  typescript: false,
  resolveSvelteField: true,
  resolveSvelteExtensions: true,
};

const defaultHotOptions = {
  optimistic: true,
  noPreserveState: true,
  compatVite: true,
  absoluteImports: false,
};

const forcedHotOptions = {
  absoluteImports: false,
  compatVite: true,
};

const defaultSvelteOptions = {
  format: 'esm',
  generate: 'dom',
  css: false,
  emitCss: true,
  extensions: ['.svelte'],
};

const forcedSvelteOptions = {
  dev: {
    format: 'esm',
    generate: 'dom',
    dev: true,
    css: true,
    emitCss: false,
  },
  build: {
    format: 'esm',
    generate: 'dom',
    css: false,
    emitCss: true,
  },
};

function applyForcedOptions(config, forcedOptions) {
  const appliedChanges = {};
  for (const [key, value] of Object.entries(forcedOptions)) {
    if (config[key] !== value) {
      if (Object.prototype.hasOwnProperty.call(config, key)) {
        appliedChanges[key] = value;
      }
      config[key] = value;
    }
  }
  return appliedChanges;
}

async function hasTypescriptPreprocessor(svelteConfig) {
  if (!Array.isArray(svelteConfig.preprocess)) {
    return false;
  }
  if (!svelteConfig.preprocess[0].script) {
    return false;
  }
  try {
    const result = await svelteConfig.preprocess[0].script(
      { content: 'const x:string="y";export{}', attributes: { lang: 'ts' }, filename: 'Test.svelte' },
      { lang: 'ts' },
      'Test.svelte',
    );
    log.debug('script preprocessor at index 0 is typescript. transformed:', result);
    return true;
  } catch (e) {
    log.debug('script preprocessor at index 0 failed to transform typescript', e);
    return false;
  }
}
async function setupTypeScriptPreprocessor(svelteConfig, isBuild) {
  const hasTypescript = await hasTypescriptPreprocessor(svelteConfig);
  if (!hasTypescript) {
    throw new Error('svite -ts requires a typescript preprocessor at index 0 in svelte.config.js preprocess:[]');
  }
  if (!isBuild) {
    // unfortunately esbuild preprocess does not work properly with imports of svelte components as of now
    // svelteConfig.preprocess.unshift(require('./tools/svelte-preprocess-ts-vite'));

    const { typescript } = require('svelte-preprocess');
    const devTS = {
      module: 'esnext',
      target: 'es2017',
      moduleResolution: 'node',
      importsNotUsedAsValues: 'error',
      types: ['svelte', 'vite/dist/importMeta'],
      sourceMap: true,
      isolatedModules: true,
    };
    log.warn('overriding typescript preprocessor to support hmr in vite', devTS);
    svelteConfig.preprocess[0] = typescript(devTS);
  }
}

async function finalizeConfig(config, type) {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevServer = !!config.vite;
  const isBuild = type === 'build';
  const svelteConfig = config[type];
  const forcedOptions = forcedSvelteOptions[type];
  const isTypescript = config.svite.typescript;
  if (isTypescript) {
    await setupTypeScriptPreprocessor(svelteConfig, isBuild);
  }
  if (isBuild) {
    forcedOptions.dev = (isDevServer && !!config.dev.hot) || !isProduction;
  }
  const appliedChanges = applyForcedOptions(svelteConfig, forcedOptions);
  if (isDevServer && isBuild) {
    type = 'optimizeDeps';
  }
  if (Object.keys(appliedChanges).length > 0) {
    log.info(`applied changes to svelte config used for ${type}.`, appliedChanges);
  }
  log.debug.enabled && log.debug(`svelte config used for ${type}`, svelteConfig);
  if (isDevServer && log.debug.enabled) {
    log.debug(''); // extra line to prevent config log cutoff
  }
  return svelteConfig;
}

function readSvelteConfigFile() {
  const svelteConfigFilePath = path.join(process.cwd(), 'svelte.config.js');
  try {
    let config = require(svelteConfigFilePath);
    const { compilerOptions, ...otherOptions } = config;
    return compilerOptions ? { ...compilerOptions, ...otherOptions } : otherOptions;
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      log.error(`failed to load svelte config from ${svelteConfigFilePath}`, e);
    }
  }
}
/**
 * create required configs by merging default config, svelte config and passed pluginOptions.
 * finally override some options to ensure dev and build work as expected.
 * e.g. not hot mode with production build, when hot is enabled svelte compile needs to be dev: true
 *
 */
function createConfig(pluginOptions) {
  const baseSvelteOptions = readSvelteConfigFile();

  const { svelte: sveltePluginOptions, ...svitePluginOptions } = pluginOptions || {};

  const sviteConfig = {
    ...defaultOptions,
    ...svitePluginOptions,
  };

  const svelteConfig = {
    ...defaultSvelteOptions,
    ...baseSvelteOptions,
    ...sveltePluginOptions,
  };

  if (svelteConfig.extensions.includes('.html')) {
    log.warn('vite build does not support .html extension for svelte');
    svelteConfig.extensions = svelteConfig.extensions.filter((ex) => ex !== '.html');
  }
  if (!svelteConfig.onwarn) {
    svelteConfig.onwarn = require('./tools/onwarn');
  }

  const dev = { ...svelteConfig };
  const build = { ...svelteConfig };

  if (sviteConfig.hot) {
    dev.hot =
      sviteConfig.hot === true
        ? defaultHotOptions
        : {
            ...defaultHotOptions,
            ...sviteConfig.hot,
            ...forcedHotOptions,
          };
  }

  return {
    dev,
    build,
    svite: sviteConfig,
  };
}

/**
 * builds a filter function that works out if rollup-plugin-svelte would process the request
 * this prevents calling transform when not needed
 *
 */
function createSvelteTransformTest(svelteOptions) {
  const filter = createFilter(svelteOptions.include, svelteOptions.exclude);
  const extensions = svelteOptions.extensions || ['.svelte'];
  return (ctx) => filter(ctx.path) && extensions.some((ext) => ctx.path.endsWith(ext));
}

function updateViteConfig(config) {
  const viteConfig = config.vite;
  let addToInclude = svelteDeps.concat();
  let addToExclude = ['svelte'];
  if (config.dev.hot) {
    addToExclude.push('svelte-hmr');
    addToInclude.push('svelte-hmr/runtime/esm', 'svelte-hmr/runtime/proxy-adapter-dom', 'svelte-hmr/runtime/hot-api-esm');
  }
  const optimizeDeps = viteConfig.optimizeDeps;
  if (!optimizeDeps) {
    viteConfig.optimizeDeps = {
      include: addToInclude,
      exclude: addToExclude,
    };
  } else {
    if (!optimizeDeps.exclude) {
      optimizeDeps.exclude = addToExclude;
    } else {
      optimizeDeps.exclude = [...new Set(addToExclude.concat(optimizeDeps.exclude))];
    }
    if (!optimizeDeps.include) {
      optimizeDeps.include = addToInclude;
    } else {
      optimizeDeps.include = [...new Set(addToInclude.concat(optimizeDeps.include))];
    }
    optimizeDeps.include = optimizeDeps.include.filter((i) => !optimizeDeps.exclude.includes(i));
  }
  log.debug.enabled && log.debug('vite config', viteConfig);
}

async function createRollupPluginSvelteHot(config, type) {
  const finalSvelteConfig = await finalizeConfig(config, type);
  return rollupPluginSvelteHot(finalSvelteConfig);
}

function createDev(config) {
  const useTransformCache = config.svite.useTransformCache;
  const isSvelteRequest = createSvelteTransformTest(config.dev);
  let devPlugin; // initialized in configureServer hook to prevent eager fruitless initialization during vite build

  const transforms = [];

  const configureServer = [
    async ({ config: viteConfig }) => {
      config.vite = viteConfig;
      updateViteConfig(config);
      devPlugin = await createRollupPluginSvelteHot(config, 'dev');
    },
  ];

  async function devTransform(code, id) {
    try {
      return await devPlugin.transform(code, id);
    } catch (e) {
      config.dev.onwarn(e);
      throw e;
    }
  }

  if (useTransformCache) {
    const transformCache = new LRU(10000);

    transforms.push({
      test: (ctx) => {
        return !ctx.isBuild && !!devPlugin && isSvelteRequest(ctx);
      },
      transform: async ({ path: id, code, notModified }) => {
        if (notModified && transformCache.has(id)) {
          log.debug.enabled && log.debug(`transform cache get ${id}`);
          return transformCache.get(id);
        }
        const result = await devTransform(code, id);
        log.debug.enabled && log.debug(`transform cache set ${id}`);
        transformCache.set(id, result);
        return result;
      },
    });
  } else {
    transforms.push({
      test: (ctx) => !ctx.isBuild && isSvelteRequest(ctx),
      transform: async ({ path: id, code }) => {
        return devTransform(code, id);
      },
    });
  }

  return {
    transforms,
    configureServer,
  };
}

function rollupPluginDeferred(name, createPlugin) {
  const wrapper = {
    name,
    options: async function (options) {
      const plugin = await createPlugin();
      Object.keys(plugin).forEach((key) => {
        if (key !== 'options') {
          wrapper[key] = plugin[key];
        }
      });
      return plugin.options ? await plugin.options.apply(this, options) : options;
    },
  };
  return wrapper;
}

function createBuildPlugins(config) {
  const buildPlugin = rollupPluginDeferred('svelte', async () => {
    return await createRollupPluginSvelteHot(config, 'build');
  });

  // prevent vite build spinner from swallowing our logs
  const logProtectPlugin = {
    name: 'svite:logprotect',
    options: () => {
      log.setViteLogOverwriteProtection(true);
    },
    buildEnd: () => {
      log.setViteLogOverwriteProtection(false);
    },
  };
  return [
    { name: 'svite', options: () => {} }, // just a marker so cli can test if svite was loaded from vite config
    logProtectPlugin,
    buildPlugin,
  ];
}

function createVitePlugin(config) {
  const buildPlugins = createBuildPlugins(config);
  const { transforms, configureServer } = createDev(config);
  return {
    name: 'svite',
    rollupInputOptions: {
      plugins: buildPlugins,
    },
    transforms,
    configureServer,
  };
}

function patchVite(config) {
  const viteResolver = require('vite/dist/node/resolver');
  const mainFields = viteResolver.mainFields;
  const supportedExts = viteResolver.supportedExts;
  if (config.svite.resolveSvelteField) {
    try {
      mainFields.unshift('svelte');
      log.debug('added "svelte" to list of fields to resolve in package.json', mainFields);
    } catch (e) {
      log.warn('failed to add svelte to vite resolver mainFields', e);
    }
  }
  if (config.svite.resolveSvelteExtensions) {
    try {
      supportedExts.unshift(...config.build.extensions);
      log.debug(`added "${config.build.extensions.join(', ')}" to list of extensions to resolve`, supportedExts);
    } catch (e) {
      log.warn('failed to add svelte extensions to list of extensions to resolve', e);
    }
  }
  config.svite.resolve = {
    mainFields,
    supportedExts,
  };
}

module.exports = function svite(pluginOptions = {}) {
  if (pluginOptions.debug) {
    log.setLevel('debug');
  } else if (pluginOptions.logLevel) {
    log.setLevel(pluginOptions.logLevel);
  }
  const config = createConfig(pluginOptions);
  log.setLevel(config.svite.logLevel);
  patchVite(config);
  return createVitePlugin(config);
};
