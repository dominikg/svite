#!/usr/bin/env node
/* eslint-env node */
const ncu = require('npm-check-updates');
const glob = require('glob');

async function listPackageFiles(baseDir) {
  return new Promise((resolve, reject) =>
    glob(`${baseDir}/**/*/package.json`, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    }),
  );
}

async function collectPackagesToUpdate() {
  const examples = await listPackageFiles('examples');
  const other = ['test/hmr-test/package.json', 'package.json'];
  return examples.concat(other);
}

async function checkUpdates(packageFile, upgrade, filter, reject) {
  const options = {
    packageFile,
    upgrade,
    jsonUpgraded: false,
    loglevel: 'warn',
  };
  if (filter) {
    options.filter = filter;
  }
  if (reject) {
    options.reject = reject;
  }

  await ncu.run(options);
}

async function main() {
  const flags = process.argv.length > 2 ? process.argv.slice(2) : [];
  const upgrade = flags.includes('--upgrade');
  const peersOnly = flags.includes('--peers-only');
  const skipPeers = flags.includes('--skip-peers');
  const peers = Object.keys(require('../package.json').peerDependencies || {});
  const filter = peersOnly ? peers : undefined;
  const reject = skipPeers ? peers : undefined;
  const packageFiles = await collectPackagesToUpdate();
  for (let packageFile of packageFiles) {
    await checkUpdates(packageFile, upgrade, filter, reject);
  }
}

main()
  .then(() => {})
  .catch((e) => {
    console.error('update error', e);
    process.exit(1);
  });
