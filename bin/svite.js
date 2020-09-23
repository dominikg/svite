#!/usr/bin/env node
const program = require('commander');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const pkg = require(path.join(__dirname, '../package.json'));
const version = pkg.version;
const execa = require('execa');
const fs = require('fs');

const buildOptionDefaults = {
  base: '/',
  outDir: 'dist',
  assetsDir: '_assets',
  assetsInlineLimit: 4096,
  sourcemap: false,
  minify: 'terser',
  typescript: false,
};

const devOptionDefaults = {
  typescript: false,
  useTransformCache: false,
  hot: true,
  resolveSvelteField: true,
  resolveSvelteExtensions: false,
  resolveAbsoluteImportsInsideRoot: true,
  port: 3000,
};

// required after process.env.DEBUG was set so 'debug' works with configured patterns
let vite;
let log = console;

async function setupSvite(options) {
  if (options.mode && process.env.NODE_ENV == null) {
    log.debug(`setting process.env.NODE_ENV=${options.mode}`);
    process.env.NODE_ENV = options.mode;
  }
  try {
    vite = require('vite');
  } catch (e) {
    log.error('failed to find vite. Vite is required to run this svite command', e);
    process.exit(1);
  }

  const userConfig = await vite.resolveConfig(options.mode, options.config);
  let viteConfig = {
    ...userConfig,
    ...options,
  };
  if (
    viteConfig.rollupInputOptions &&
    viteConfig.rollupInputOptions.plugins &&
    viteConfig.rollupInputOptions.plugins.some((p) => p.name === 'svite')
  ) {
    log.debug('using svite plugin provided in vite config');
  } else {
    // svite not included in vite config, add it now
    log.debug('adding svite plugin to vite');
    const svite = require(path.resolve(__dirname, '../index.js'));
    const svitePlugin = svite(options);
    viteConfig = resolvePlugin(viteConfig, svitePlugin);
  }

  optimizeViteConfig(viteConfig);
  return viteConfig;
}

function optimizeViteConfig(viteConfig) {
  log.debug('disabling vue support in vite');
  viteConfig.enableRollupPluginVue = false;
  viteConfig.vueCompilerOptions = {};
  viteConfig.vueTransformAssetUrls = {};
  viteConfig.vueCustomBlockTransforms = {};
  const dedupeSvelte = [
    'svelte/animate',
    'svelte/easing',
    'svelte/internal',
    'svelte/motion',
    'svelte/store',
    'svelte/transition',
    'svelte',
  ];
  if (!viteConfig.rollupDedupe) {
    viteConfig.rollupDedupe = dedupeSvelte;
  } else {
    viteConfig.rollupDedupe = [...new Set([...viteConfig.rollupDedupe, dedupeSvelte])];
  }
  log.debug('added svelte to rollupDedupe', viteConfig.rollupDedupe.join(`, `));
}

function resolvePlugin(config, plugin) {
  return {
    ...config,
    ...plugin,
    alias: {
      ...plugin.alias,
      ...config.alias,
    },
    define: {
      ...plugin.define,
      ...config.define,
    },
    transforms: [...(config.transforms || []), ...(plugin.transforms || [])],
    resolvers: [...(config.resolvers || []), ...(plugin.resolvers || [])],
    configureServer: [].concat(config.configureServer || [], plugin.configureServer || []),
    vueCompilerOptions: {},
    vueTransformAssetUrls: {},
    vueCustomBlockTransforms: {},
    rollupInputOptions: mergeRollupOptions(config.rollupInputOptions, plugin.rollupInputOptions),
    rollupOutputOptions: mergeRollupOptions(config.rollupOutputOptions, plugin.rollupOutputOptions),
    enableRollupPluginVue: false,
  };
}

function mergeRollupOptions(rollupOptions1, rollupOptions2) {
  if (!rollupOptions1) {
    return rollupOptions2;
  }
  if (!rollupOptions2) {
    return rollupOptions1;
  }
  return {
    ...rollupOptions1,
    ...rollupOptions2,
    plugins: [...(rollupOptions1.plugins || []), ...(rollupOptions2.plugins || [])],
  };
}

async function runServe(options) {
  const start = Date.now();
  const server = vite.createServer(options);
  let port = options.port || 3000;
  let hostname = options.hostname || 'localhost';
  const protocol = options.https ? 'https' : 'http';
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      log.warn(`Port ${port} is in use, trying another one...`);
      setTimeout(() => {
        server.close();
        server.listen(++port);
      }, 100);
    } else {
      log.error('server error', e);
    }
  });
  await server.listen(port, () => {
    log.info(`  Dev server running at:`);
    const interfaces = os.networkInterfaces();
    Object.keys(interfaces).forEach((key) => {
      (interfaces[key] || [])
        .filter((details) => details.family === 'IPv4')
        .map((detail) => {
          return {
            type: detail.address.includes('127.0.0.1') ? 'Local:   ' : 'Network: ',
            host: detail.address.replace('127.0.0.1', hostname),
          };
        })
        .forEach(({ type, host }) => {
          const url = `${protocol}://${host}:${chalk.bold(port)}/`;
          log.info(`  > ${type} ${chalk.cyan(url)}`);
        });
    });
    log.debug(`server ready in ${Date.now() - start}ms.`);
    if (options.open) {
      require('vite/dist/node/utils/openBrowser').openBrowser(`${protocol}://${hostname}:${port}`);
    }
  });
}

async function runBuild(options) {
  try {
    if (options.ssr) {
      await vite.ssrBuild({
        ...options,
        ssr: false,
        outDir: !options.outDir || options.outDir === buildOptionDefaults.outDir ? 'dist-ssr' : options.outDir,
        assetsDir: !options.assetsDir || options.assetsDir === buildOptionDefaults.assetsDir ? '.' : options.assetsDir,
      });
    } else {
      await vite.build(options);
    }
    process.exit(0);
  } catch (err) {
    log.error('build error', err);
    process.exit(1);
  }
}

async function runOptimize(options) {
  try {
    options.configureServer[0]({ config: options }); //hack, call configureServer hook of plugin to get optimizeDeps populated
    await vite.optimizeDeps(options, true);
    process.exit(0);
  } catch (err) {
    log.error('optimize error', err);
    process.exit(1);
  }
}

function setupDebug(options) {
  const debugOption = options.debug;
  if (debugOption) {
    if (!process.env.DEBUG) {
      process.env.DEBUG = debugOption === 'true' || debugOption === true ? 'vite:*,svite:*' : `${debugOption}`;
    }
    options.logLevel = 'debug';
  }
  log = require('../tools/log');
  if (debugOption) {
    log.setLevel('debug');
  }
}
const templates = ['minimal', 'routify-mdsvex', 'postcss-tailwind', 'svelte-preprocess-auto'];
const typescriptTemplates = ['minimal', 'routify-mdsvex', 'postcss-tailwind', 'svelte-preprocess-auto'];

async function installTemplate(options) {
  let template = options.template;

  if (!templates.includes(template)) {
    log.error(`invalid template ${template}. Valid: ${JSON.stringify(templates)}`);
    return;
  }
  if (options.typescript) {
    if (!typescriptTemplates.includes(template)) {
      log.error(`no typescript variant available for ${template} Valid: ${JSON.stringify(typescriptTemplates)}`);
      return;
    }
    template = `typescript/${template}`;
  }
  const targetDir = path.join(process.cwd(), options.targetDir || `svite-${template.replace('/', '-')}`);

  const degit = require('degit');
  const githubRepo = pkg.repository.url.match(/github\.com\/(.*).git/)[1];
  const beta = pkg.version.indexOf('beta') > -1;
  const degitPath = `${githubRepo}/examples/${template}${beta ? '#beta' : ''}`;
  const degitOptions = {
    cache: options.cache,
    force: options.force,
    verbose: options.debug,
    mode: 'tar',
  };
  if (options.debug) {
    log.debug(`degit ${degitPath}`, degitOptions);
  }
  const emitter = degit(degitPath, degitOptions);

  emitter.on('info', (info) => {
    log.info(info.message);
  });
  emitter.on('warn', (warning) => {
    log.warn(warning.message);
  });
  emitter.on('error', (error) => {
    log.error(error.message, error);
  });

  await emitter.clone(targetDir);
  log.info(`created ${targetDir}`);
  await updatePkg(targetDir);
  await addVsCodePluginRecommendation(targetDir);

  if (!options.skipInstall) {
    await installDependencies(targetDir, options.packageManager);
  }

  if (!options.skipGit) {
    await gitInit(targetDir);
    if (!options.skipCommit) {
      await gitCommit(targetDir);
    }
  }
}

async function updatePkg(dir) {
  const pkgFile = path.join(dir, 'package.json');
  const pkg = require(pkgFile);
  pkg.name = path.basename(dir);
  pkg.devDependencies.svite = `^${version}`;
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));
}

async function addVsCodePluginRecommendation(dir) {
  fs.mkdirSync(path.join(dir, '.vscode'));
  fs.writeFileSync(
    path.join(dir, '.vscode', 'extensions.json'),
    `{
  "recommendations": ["svelte.svelte-vscode"]
}
`,
  );
}

async function installDependencies(dir, packageManager) {
  try {
    if (packageManager === 'yarn2') {
      try {
        await execa('yarn', ['set', 'version', 'berry'], { cwd: dir });
      } catch (e) {
        console.error(`yarn set version berry failed in ${dir}`, e);
        throw e;
      }
      packageManager = 'yarn';
    }
    await execa(packageManager, ['install'], { cwd: dir });
  } catch (e) {
    console.error(`${packageManager} install failed in ${dir}`, e);
    throw e;
  }
}

async function gitInit(dir) {
  try {
    await execa('git', ['init'], { cwd: dir });
  } catch (e) {
    console.error(`git init failed in ${dir}`, e);
    throw e;
  }
}

async function gitCommit(dir) {
  try {
    await execa('git', ['add', '.'], { cwd: dir });
    await execa('git', ['commit', '-m initial commit'], { cwd: dir });
  } catch (e) {
    console.error(`git commit failed in ${dir}`, e);
    throw e;
  }
}

function processOptions(cmd, defaults) {
  const options = convertDefaultOptionTypes(cmd.opts(), defaults);
  setupDebug(options);
  removeDefaults(options, defaults);
  return options;
}

function convertDefaultOptionTypes(options, defaults) {
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const optionValue = options[key];
    if (optionValue == null) {
      options[key] = defaultValue;
      continue;
    }
    const defaultType = typeof defaultValue;
    const optionType = typeof optionValue;
    if (defaultType === optionType) {
      continue;
    }

    if (defaultType === 'boolean') {
      options[key] = convertToBoolean(optionValue, key);
    } else if (defaultType === 'number') {
      options[key] = convertToNumber(optionValue, key);
    } else if (defaultType === 'string') {
      options[key] = convertToString(optionValue);
    } else {
      throw new Error('missing converter for option type ' + defaultType);
    }
  }
  return options;
}

function convertToBoolean(optionValue, optionKey) {
  if (optionValue === 'true') {
    return true;
  } else if (optionValue === 'false') {
    return false;
  } else {
    throw new Error(`invalid boolean option ${optionKey}: ${optionValue}. Allowed values: 'true', 'false'`);
  }
}

function convertToNumber(optionValue, optionKey) {
  try {
    const result = parseInt(optionValue, 10);
    if (!isNaN(result)) {
      return result;
    }
  } catch (e) {
    log.debug('parseInt failed', e);
  }
  throw new Error(`invalid number option ${optionKey}: ${optionValue}. Value must be a number`);
}

function convertToString(optionValue) {
  return '' + optionValue;
}

function removeDefaults(options, defaults) {
  for (const [key, value] of Object.entries(defaults)) {
    if (options[key] === value) {
      delete options[key];
    }
  }
}

async function main() {
  program.version(version, '-v, --version').description('svite - build svelte apps with vite');

  program
    .command('dev', { isDefault: true })
    .description('start dev server')
    .option(
      '-d,  --debug [boolean|string]',
      'enable debug output. you can use true for "vite:*,svite:*" or supply your own patterns. Separate patterns with , start with - to filter. eg: "foo:*,-foo:bar" ',
      false,
    )
    .option('-r,  --root <string>', 'use specified directory as root')
    .option('-c,  --config <string>', 'use specified vite config file')
    .option('-ts, --typescript [boolean]', 'enable typescript preprocessing in svelte !!!EXPERIMENTAL!!!', devOptionDefaults.typescript)
    .option('-m,  --mode <string>', 'specify env mode eg. ["development","test","staging","production"]', 'development')
    .option('-p,  --port <port>', 'port to use for serve', devOptionDefaults.port)
    .option('-o,  --open', 'open browser on start')
    .option('--useTransformCache [boolean]', 'use transform cache for faster hmr', devOptionDefaults.useTransformCache)
    .option('--hot [boolean]', 'enable/disable hmr for svelte', devOptionDefaults.hot)
    .option('--resolveSvelteField [boolean]', 'resolve via svelte field in package.json', devOptionDefaults.resolveSvelteField)
    .option(
      '--resolveSvelteExtensions [boolean]',
      'resolve svelte extensions in modules !!!EXPERIMENTAL!!!',
      devOptionDefaults.resolveSvelteExtensions,
    )
    .option(
      '--resolveAbsoluteImportsInsideRoot [boolean]',
      'resolve absolute imports if they end up being inside rootDir (mostly used in generated code)',
      devOptionDefaults.resolveAbsoluteImportsInsideRoot,
    )
    .action(async (cmd) => {
      const options = processOptions(cmd, devOptionDefaults);
      if (options.mode !== 'development') {
        log.info(`running svite dev with custom mode "${options.mode}"`);
      }
      await runServe(await setupSvite(options));
    });

  program
    .command('build')
    .description('build')
    .option(
      '-d, --debug [boolean|string]',
      'enable debug output. you can use true for "vite:*,svite:*" or supply your own patterns. Separate patterns with , start with - to filter. eg: "foo:*,-foo:bar" ',
      false,
    )
    .option('-r,  --root <string>', 'use specified directory as root')
    .option('-c,  --config <string>', 'use specified vite config file')
    .option('-ts, --typescript [boolean]', 'enable typescript preprocessing in svelte !!!EXPERIMENTAL!!!', buildOptionDefaults.typescript)
    .option('-m,  --mode <string>', 'specify env mode eg. ["development","test","staging","production"]', 'production')
    .option('--base <string>', 'public base path for build', buildOptionDefaults.base)
    .option('--outDir <string>', 'output directory for build', buildOptionDefaults.outDir)
    .option('--assetsDir <string>', 'directory under outDir to place assets in', buildOptionDefaults.assetsDir)
    .option('--assetsInlineLimit <number>', 'static asset base64 inline threshold in bytes', buildOptionDefaults.assetsInlineLimit)
    .option('--sourcemap [boolean]', 'output source maps for build', buildOptionDefaults.sourcemap)
    .option(
      '--minify [boolean | "terser" | "esbuild"]',
      'enable/disable minification, or specify minifier to use.',
      buildOptionDefaults.minify,
    )
    .option(
      '--stats [boolean|string]',
      'generate bundle stats with rollup-plugin-visualizer. true, "json": stats.json, ["html" "treemap","sunburst","network"]: stats.html',
    )
    .option('--ssr [boolean]', 'build for server-side rendering')
    .action(async (cmd) => {
      const options = processOptions(cmd, buildOptionDefaults);
      if (options.mode !== 'production') {
        log.info(`running svite build with custom mode "${options.mode}"`);
      }
      const buildOptions = await setupSvite(options);
      if (options.stats) {
        try {
          const visualizer = require('rollup-plugin-visualizer');
          const visualizerOptions = {};
          if (options.stats === true || options.stats === 'json') {
            visualizerOptions.json = true;
          } else if (options.stats === 'html') {
            visualizerOptions.template = 'treemap';
          } else if (['treemap', 'sunburst', 'network'].includes(options.stats)) {
            visualizerOptions.template = options.stats;
          } else {
            throw new Error(`invalid value for stats option: ${options.stats}`);
          }
          visualizerOptions.filename = path.join(
            options.outDir || buildOptionDefaults.outDir,
            `stats.${visualizerOptions.json ? 'json' : 'html'}`,
          );
          buildOptions.rollupInputOptions.plugins.push(visualizer(visualizerOptions));
        } catch (e) {
          log.error('stats option requires rollup-plugin-visualizer to be installed', e);
          throw e;
        }
      }
      await runBuild(buildOptions);
    });

  program
    .command('optimize')
    .description('run vite optimizer')
    .option(
      '-d, --debug [boolean|string]',
      'enable debug output. you can use true for "vite:*,svite:*" or supply your own patterns. Separate patterns with , start with - to filter. eg: "foo:*,-foo:bar" ',
      false,
    )
    .option('-c, --config <string>', 'use specified vite config file')
    .option('-f, --force', 'force optimize even if hash is equal')
    .action(async (cmd) => {
      const options = cmd.opts();
      setupDebug(options);
      const buildConfig = await setupSvite(options);
      if (options.force) {
        buildConfig.force = true;
      }
      await runOptimize(buildConfig);
    });

  program
    .command('create [targetDir]')
    .description('create a new project. If you do not specify targetDir, "./svite-<template>" will be used')
    .option('-t, --template <string>', `template for new project. ${JSON.stringify(templates)}`, 'minimal')
    .option('-ts, --typescript', 'enable typescript support for svelte !!!EXPERIMENTAL!!!', false)
    .option('-pm, --packageManager <string>', 'which package manager to use. ["npm","pnpm","yarn","yarn2"]', 'npm')
    .option('-f, --force', 'force operation even if targetDir exists and is not empty', false)
    .option('-c, --cache', 'cache template for later use', false)
    .option('-d, --debug', 'more verbose logging', false)
    .option('-si, --skip-install', 'skip install', false)
    .option('-sg, --skip-git', 'skip git init', false)
    .option('-sc, --skip-commit', 'skip initial commit', false)
    .action(async (targetDir, cmd) => {
      const options = cmd.opts();
      setupDebug(options);
      options.targetDir = targetDir;
      await installTemplate(options);
    });
  await program.parseAsync(process.argv);
}

main()
  .then(() => {
    log.debug('command success');
  })
  .catch((e) => {
    log.error('command error', e);
    process.exit(1);
  });
