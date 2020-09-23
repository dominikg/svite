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

async function checkUpdates(packageFile, upgrade) {
  await ncu.run({
    packageFile,
    upgrade,
    jsonUpgraded: false,
    loglevel: 'warn',
  });
}

async function main() {
  const upgrade = process.argv.length === 3 && process.argv[2] === '-u';
  const packageFiles = await collectPackagesToUpdate();
  for (let packageFile of packageFiles) {
    await checkUpdates(packageFile, upgrade);
  }
}

main()
  .then(() => {})
  .catch((e) => {
    console.error('update error', e);
    process.exit(1);
  });
