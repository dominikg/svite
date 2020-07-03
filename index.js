const path = require('path');
const rollupPluginSvelteHot = require('rollup-plugin-svelte-hot');
const rollupPluginNodeResolve = require('@rollup/plugin-node-resolve');
const { createFilter } = require('@rollup/pluginutils');
const log = require('./tools/log');
const LRU = require('lru-cache');
const svelteDeps = ['svelte/animate', 'svelte/easing', 'svelte/internal', 'svelte/motion', 'svelte/store', 'svelte/transition', 'svelte'];

const defaultOptions = {
  hot: true,
  useTransformCache: true,
  logLevel: 'info', // 'debug','info','warn','error'  ('silent' for no output)
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

function finalizeConfig(config, type) {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevServer = !!config.vite;
  const isBuild = type === 'build';
  const svelteConfig = config[type];
  const forcedOptions = forcedSvelteOptions[type];
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
  let addToExclude = [];
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

function createRollupPluginSvelteHot(config, type) {
  const finalSvelteConfig = finalizeConfig(config, type);
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
      devPlugin = createRollupPluginSvelteHot(config, 'dev');
    },
  ];

  if (useTransformCache) {
    // prevent rerunning svelte transform on unmodified files
    // cannot be done from transform alone as it lacks the information to decide
    // use a tandem of middleware and transform to get it done
    const useCacheMarker = '___use-cached-transform___';
    const transformCache = new LRU(10000);

    transforms.push({
      test: (ctx) => !ctx.isBuild && !!devPlugin && isSvelteRequest(ctx),
      transform: async ({ path: id, code }) => {
        const useCache = code === useCacheMarker;
        if (useCache) {
          log.debug.enabled && log.debug(`transform cache get ${id}`);
          return transformCache.get(id);
        }
        const result = await devPlugin.transform(code, id);
        log.debug.enabled && log.debug(`transform cache set ${id}`);
        transformCache.set(id, result);
        return result;
      },
    });

    configureServer.push(async ({ app, resolver }) => {
      app.use(async (ctx, next) => {
        if (isSvelteRequest(ctx)) {
          if (transformCache.has(ctx.path)) {
            await ctx.read(resolver.requestToFile(ctx.path));
            if (ctx.__notModified) {
              ctx.body = useCacheMarker;
            }
          }
        }
        await next(); // runs the transform above
      });
    });
  } else {
    transforms.push({
      test: (ctx) => !ctx.isBuild && isSvelteRequest(ctx),
      transform: async ({ path: id, code }) => {
        const result = await devPlugin.transform(code, id);
        return result;
      },
    });
  }
  return {
    transforms,
    configureServer,
  };
}

function rollupPluginDeferred(createPlugin) {
  const wrapper = {
    options: function (options) {
      const plugin = createPlugin();
      Object.keys(plugin).forEach((key) => {
        if (key !== 'options') {
          wrapper[key] = plugin[key];
        }
      });
      return plugin.options ? plugin.options.apply(this, options) : null;
    },
  };
  return wrapper;
}

function createBuildPlugins(config) {
  const buildPlugin = rollupPluginDeferred(() => {
    return createRollupPluginSvelteHot(config, 'build');
  });

  const rollupPluginDedupeSvelte = rollupPluginDeferred(() =>
    rollupPluginNodeResolve.nodeResolve({
      dedupe: (importee) => svelteDeps.includes(importee) || importee.startsWith('svelte/'),
    }),
  );

  // prevent vite build spinner from swallowing our logs
  const logProtectPlugin = {
    options: () => {
      log.setViteLogOverwriteProtection(true);
    },
    buildEnd: () => {
      log.setViteLogOverwriteProtection(false);
    },
  };
  return [
    logProtectPlugin,
    rollupPluginDedupeSvelte, // rollupDedupe vite option cannot be supplied by a plugin, so we add one for svelte here
    buildPlugin,
  ];
}

function createVitePlugin(config) {
  const buildPlugins = createBuildPlugins(config);
  const { transforms, configureServer } = createDev(config);
  return {
    rollupInputOptions: {
      plugins: buildPlugins,
    },
    transforms,
    configureServer,
  };
}

module.exports = function svite(pluginOptions = {}) {
  if (pluginOptions.logLevel) {
    log.setLevel(pluginOptions.logLevel);
  }
  const config = createConfig(pluginOptions);
  log.setLevel(config.svite.logLevel);
  return createVitePlugin(config);
};
