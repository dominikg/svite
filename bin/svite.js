#!/usr/bin/env node

const program = require('commander');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const version = require(path.join(__dirname, '../package.json')).version;
const vite = require('vite');
const log = require('../tools/log');

async function setupSvite(options) {
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
  return viteConfig;
}

function resolvePlugin(config, plugin) {
  return {
    ...config,
    alias: {
      ...plugin.alias,
      ...config.alias,
    },
    transforms: [...(config.transforms || []), ...(plugin.transforms || [])],
    resolvers: [...(config.resolvers || []), ...(plugin.resolvers || [])],
    configureServer: [].concat(config.configureServer || [], plugin.configureServer || []),
    vueCompilerOptions: {
      ...config.vueCompilerOptions,
      ...plugin.vueCompilerOptions,
    },
    vueCustomBlockTransforms: {
      ...config.vueCustomBlockTransforms,
      ...plugin.vueCustomBlockTransforms,
    },
    rollupInputOptions: {
      ...config.rollupInputOptions,
      ...plugin.rollupInputOptions,
    },
    rollupOutputOptions: {
      ...config.rollupOutputOptions,
      ...plugin.rollupOutputOptions,
    },
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
  });
}
async function runBuild(options) {
  try {
    await vite.build(options);
    process.exit(0);
  } catch (err) {
    log.error('build error', err);
    process.exit(1);
  }
}

async function main() {
  program.version(version).description('svite - build svelte apps with vite');

  program
    .command('dev', { isDefault: true })
    .description('start dev server')
    .option('-d, --debug', 'enable debug output', false)
    .option('-c, --config [string]', 'use specified vite config file')
    .option('-p,--port [port]', 'port to use for serve', 3000)
    .option('-sw, --serviceWorker [boolean]', 'enable service worker caching', false)
    .option('--open [boolean]', 'open browser on start')
    .action(async (cmd) => {
      const options = cmd.opts();
      if (options.debug) {
        log.setLevel('debug');
      }
      options.mode = 'development';
      await runServe(await setupSvite(options));
    });

  program
    .command('build')
    .description('build')
    .option('-d, --debug', 'enable debug output', false)
    .option('-c, --config [string]', 'use specified vite config file')
    .option('--base [string]', 'public base path for build', '/')
    .option('--outDir [string]', 'output directory for build', 'dist')
    .option('--assetsDir [string]', 'directory under outDir to place assets in', '_assets')
    .option('--assetsInlineLimit [number]', 'static asset base64 inline threshold in bytes', 4096)
    .option('--sourcemap [boolean]', 'output source maps for build', false)
    .option('--minify [boolean | "terser" | "esbuild"]', 'enable/disable minification, or specify minifier to use.', 'terser')
    .option('-m, --mode [string]', 'specify env mode', 'production')
    // .option('--ssr [boolean]', 'build for server-side rendering')
    .action(async (cmd) => {
      const options = cmd.opts();
      if (options.debug) {
        log.setLevel('debug');
      }
      await runBuild(await setupSvite(options));
    });
  await program.parseAsync(process.argv);
}

main()
  .then(() => {
    log.debug('command success');
  })
  .catch((e) => {
    log.debug('command error', e);
    process.exit(1);
  });
