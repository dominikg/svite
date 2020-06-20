const path = require('path');
const rollupPluginSvelte = require('rollup-plugin-svelte');
const { createFilter } = require('rollup-pluginutils');
const { createMakeHot } = require('svelte-hmr');
const { cosmiconfigSync } = require('cosmiconfig');
const { walk } = require('svelte/compiler');

const svelteDeps = ['svelte', 'svelte/animate', 'svelte/easing', 'svelte/internal', 'svelte/motion', 'svelte/store', 'svelte/transition'];

const rollupPluginDedupeSvelte = require('@rollup/plugin-node-resolve').nodeResolve({
  dedupe: (importee) => svelteDeps.includes(importee) || importee.startsWith('svelte/'),
});

const makeHot = createMakeHot({ walk });

// default config to start building upon. hot value is also used if hot = true is passed in
const defaultConfig = {
  hot: {
    compatVite: true,
    optimistic: true,
  },
};

// values to fix for svelte compiler in dev
const forcedSvelteDevOptions = {
  css: true, // no exernal css in dev mode until we figure out how that could work
  emitCss: false, // there's nothing listening for a possible emit, so don't.
  format: 'esm', // pretty sure vite won't work with anything else
  generate: 'dom', // just to make sure
};

// values to fix for svelte compiler in build
const forcedSvelteBuildOptions = {
  css: false,
  format: 'esm', // pretty sure vite won't work with anything else
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
    console.error('failed to load svelte config', e);
    baseConfig = {};
  }

  const config = {
    ...defaultConfig,
    ...baseConfig,
    ...pluginOptions,
  };

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    config.hot = false; // no hmr in production mode
  }

  if (config.hot === true) {
    config.hot = defaultConfig.hot; // use default hot config for true
  }

  if (config.hot) {
    config.dev = true; // needed, otherwise svelte-hmr doesn't work
  }

  const { hot, ...svelte } = config;

  if (!svelte.extensions) {
    svelte.extensions = ['.svelte'];
  } else if (svelte.extensions.includes('.html')) {
    console.warn('vite build does not support .html extension for svelte');
    svelte.extensions = svelte.extensions.filter((ex) => ex !== '.html');
  }

  const dev = {
    ...svelte,
    ...forcedSvelteDevOptions,
  };

  const build = {
    ...svelte,
    ...forcedSvelteBuildOptions,
  };

  if (isProduction) {
    build.dev = false;
  }

  return {
    hot,
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
  return (ctx) => ctx && ctx.path && filter(ctx.path) && extensions.includes(path.extname(ctx.path));
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
    console.warn('failed to add optimizeDeps to vite optimizeDeps');
  }
}

module.exports = function svite(pluginOptions = {}) {
  const config = createConfigs(pluginOptions);
  const devRollupPluginSvelte = rollupPluginSvelte(config.dev);
  const buildRollupPluginSvelte = rollupPluginSvelte(config.build);
  const isSvelteRequest = createSvelteTransformTest(config.dev);

  return {
    rollupDedupe: svelteDeps, // doesn't work here
    rollupInputOptions: {
      plugins: [
        rollupPluginDedupeSvelte, // but this does.
        //buildRollupPluginSvelte , // transform handles building, reenable here and dev only test to switch
      ],
    },
    transforms: [
      {
        //test: (ctx) => !ctx.isBuild && isSvelteRequest(ctx), // dev only test
        test: (ctx) => isSvelteRequest(ctx),
        transform: async ({ id, code, isBuild }) => {
          if (isBuild) {
            return buildRollupPluginSvelte.transform(code, id);
          }
          // console.log('compile', ctx.path)

          const compiled = { js: await devRollupPluginSvelte.transform(code, id) };
          const result = { ...compiled.js };
          if (config.hot) {
            result.code = makeHot(id, result.code, config.hot, compiled, code, config.dev);
          }
          return result;
        },
      },
    ],
    configureServer: [
      async ({ config: viteConfig }) => {
        config.vite = viteConfig;
        updateViteConfig(config);
      },
    ],
  };
};
