const rollupPluginSvelteHot = require('rollup-plugin-svelte-hot');
const { createFilter } = require('@rollup/pluginutils');
const { cosmiconfigSync } = require('cosmiconfig');
const log = require('./tools/log');

const svelteDeps = ['svelte', 'svelte/animate', 'svelte/easing', 'svelte/internal', 'svelte/motion', 'svelte/store', 'svelte/transition'];

const rollupPluginDedupeSvelte = require('@rollup/plugin-node-resolve').nodeResolve({
  dedupe: (importee) => svelteDeps.includes(importee) || importee.startsWith('svelte/'),
});

const defaultHotOptions = {
  compatVite: true,
  optimistic: true,
};

// default config to start building upon.
const defaultConfig = {
  hot: defaultHotOptions,
  css: false,
  emitCss: true,
};

/**
 * create required configs by merging default config, svelte config (read via cosmiconfig), passed pluginOptions.
 * finally override some options to ensure dev and build work as expected.
 * e.g. not hot mode with production build, when hot is enabled svelte compile needs to be dev: true
 *
 */
function createConfigs(pluginOptions) {
  let baseConfig;
  try {
    const searchResult = cosmiconfigSync('svelte').search();
    baseConfig = !searchResult || searchResult.isEmpty ? {} : searchResult.config;
  } catch (e) {
    log.error('failed to load svelte config', e);
    throw e;
  }

  const config = {
    ...defaultConfig,
    ...baseConfig,
    ...pluginOptions,
  };

  const isProduction = process.env.NODE_ENV === 'production';

  if (!config.extensions) {
    config.extensions = ['.svelte'];
  } else if (config.extensions.includes('.html')) {
    log.warn('vite build does not support .html extension for svelte');
    config.extensions = config.extensions.filter((ex) => ex !== '.html');
  }
  if (!config.onwarn) {
    config.onwarn = require('./tools/rollupwarn');
  }

  const build = {
    ...config,
  };

  // no hmr in build config
  delete build.hot;

  const dev = {
    ...config,
  };

  if (config.hot === true) {
    dev.hot = defaultHotOptions; // use default hot config for true
  }

  if (dev.hot) {
    dev.dev = true; // needed, otherwise svelte-hmr doesn't work
  }

  if (isProduction) {
    build.dev = false;
  }

  return {
    dev,
    build,
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
  const optimizeDeps = {
    include: svelteDeps.concat(),
  };
  if (config.hot) {
    optimizeDeps.include.push('svelte-hmr', 'svelte-hmr/runtime/esm', 'svelte-hmr/runtime/proxy-adapter-dom');
  }
  if (!viteConfig.optimizeDeps) {
    viteConfig.optimizeDeps = optimizeDeps;
  } else if (viteConfig.optimizeDeps.include) {
    viteConfig.optimizeDeps.include.push(...optimizeDeps.include);
  } else {
    log.warn('failed to add optimizeDeps to vite optimizeDeps');
  }
}

module.exports = function svite(pluginOptions = {}) {
  const config = createConfigs(pluginOptions);
  const devPlugin = rollupPluginSvelteHot(config.dev);
  const buildPlugin = rollupPluginSvelteHot(config.build);
  const isSvelteRequest = createSvelteTransformTest(config.dev);

  return {
    rollupInputOptions: {
      plugins: [
        rollupPluginDedupeSvelte, // rollupDedupe vite option cannot be supplied by a plugin, so we add one for svelte here
        buildPlugin,
      ],
    },
    transforms: [
      {
        // only run transform in dev, during build the buildPlugin is used instead
        // we cannot do both as it would lead to the svelte compiler running twice
        test: (ctx) => !ctx.isBuild && isSvelteRequest(ctx),
        transform: async ({ path: id, code }) => {
          return await devPlugin.transform(code, id);
        },
      },
    ],
    configureServer: [
      async ({ app, config: viteConfig }) => {
        config.vite = viteConfig;
        updateViteConfig(config);
        if (config.dev.emitCss) {
          log.warn('your svelte config has emitCss=true for development. adding workaround to prevent errors in dev mode');
          // workaround
          // emitCss adds css import call for SvelteComonent.css, which results in vite trying to load a non existant css file
          // provide a fake css body in this case, but keep it empty because svelte handles adding that css
          app.use(async (ctx, next) => {
            if (ctx.path.endsWith('.css')) {
              const cachedCss = devPlugin.load(ctx.path);
              if (cachedCss) {
                ctx.body = `/* css for ${ctx.path} is handled by svelte */`;
              }
            }
            await next();
          });
        }
      },
    ],
  };
};
