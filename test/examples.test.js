const fs = require('fs-extra');
const path = require('path');
const execa = require('execa');

const {
  cleanDir,
  closeKill,
  closeKillAll,
  expectByPolling,
  getText,
  hmrUpdateComplete,
  launchPuppeteer,
  packageSvite,
  sleep,
  takeScreenshot,
  tempDir,
  updateFile,
  writeLogs,
} = require('./utils');

jest.setTimeout(process.env.CI ? 120000 : 60000);
process.once('SIGINT', () => closeKill(process));
process.once('SIGTERM', () => closeKill(process));

const examples = ['minimal', 'postcss-tailwind', 'routify-mdsvex', 'svelte-preprocess-auto'];
const pmOptions = ['npm', 'pnpm', 'yarn', 'yarn2'];
const scriptOptions = ['javascript', 'typescript'];

describe('examples', () => {
  let svitePackage;
  let browser;
  let beforeAllSuccessful = false;
  beforeAll(async () => {
    try {
      await cleanDir(tempDir);
      svitePackage = await packageSvite();
      browser = await launchPuppeteer();
    } catch (e) {
      console.error('beforeAll failed', e);
      throw e;
    }
    beforeAllSuccessful = true;
  });
  afterAll(async () => {
    await closeKill(browser);
  });

  for (let script of scriptOptions) {
    describe(script, () => {
      for (let pm of pmOptions) {
        describe(pm, () => {
          const pmCmd = pm === 'yarn2' ? 'yarn' : pm;
          for (let example of examples) {
            describe(example, () => {
              const exampleDir = path.join(__dirname, '..', 'examples', script === 'typescript' ? `typescript/${example}` : example);
              const exampleTempDir = path.join(tempDir, script, pm, example);
              const updateExampleFile = updateFile.bind(null, exampleTempDir);
              const writeExampleLogs = writeLogs.bind(null, exampleTempDir);
              const takeExampleScreenshot = takeScreenshot.bind(null, exampleTempDir);

              let installCmd;
              let beforeAllExampleSuccessful = false;

              beforeAll(async () => {
                if (!beforeAllSuccessful) {
                  console.error('skipping beforeAllExample, previous beforeAll failed');
                  return;
                }
                try {
                  await cleanDir(exampleTempDir);
                  await fs.copy(exampleDir, exampleTempDir, {
                    filter: (file) => !/dist|dist-ssr|node_modules|package-lock\.json/.test(file),
                  });
                  const testPackageName = `svite-test-${script}-${pm}-${example}`;
                  await updateExampleFile('package.json', (c) =>
                    c
                      .replace(/"svite": ?"[^"]+"/, `"svite": "${svitePackage.replace(/\\/g, '\\\\')}"`)
                      .replace(/"name": ?"([^"]+)"/, `"name": "${testPackageName}","private":true,"license":"UNLICENSED"`),
                  );
                  await updateExampleFile('src/App.svelte', (c) => `${c}\n<div id="test-div">__xxx__</div>`);
                } catch (e) {
                  console.error('failed to setup test project in dir ' + exampleTempDir, e);
                  throw e;
                }

                try {
                  if (pm === 'yarn2') {
                    await fs.writeFile(path.join(exampleTempDir, 'yarn.lock'), '');
                    await execa(pmCmd, ['set', 'version', 'berry'], { cwd: exampleTempDir });
                  }
                  const pmCacheDir = `${path.join(__dirname, 'cache', pm)}`;
                  await fs.mkdirp(pmCacheDir);
                  switch (pm) {
                    case 'npm':
                      await fs.writeFile(path.join(exampleTempDir, '.npmrc'), `cache=${pmCacheDir}`);
                      break;
                    case 'pnpm':
                      await fs.writeFile(path.join(exampleTempDir, '.npmrc'), `store-dir=${pmCacheDir}`);
                      break;
                    case 'yarn':
                      await fs.writeFile(path.join(exampleTempDir, '.yarnrc'), `cache-folder ${pmCacheDir}`);
                      break;
                    case 'yarn2':
                      // don't write file, it was already created by set version berry above
                      await execa(pmCmd, ['config', 'set', 'cacheFolder', pmCacheDir], { cwd: exampleTempDir });
                      break;
                    default:
                      throw new Error('you must setup a cache configuration for pm ' + pm);
                  }

                  installCmd = await execa(pmCmd, ['install'], { cwd: exampleTempDir });
                  await writeExampleLogs('install', installCmd.stdout, installCmd.stderr);
                } catch (e) {
                  await writeExampleLogs('install', e.stdout, e.stderr);
                  await writeExampleLogs('install.exception', e.toString(), e.stack);
                  console.error(`${pm} install failed in ${exampleTempDir}`, e);
                  throw e;
                }
                beforeAllExampleSuccessful = true;
              });

              afterAll(async () => {
                await closeKillAll([installCmd]);
              });
              describe('svite', () => {
                describe('build', () => {
                  let buildScript;
                  let buildServer;
                  let buildPage;
                  let buildPageLogs = [];
                  let beforeAllBuildSuccessful = false;
                  beforeAll(async () => {
                    if (!beforeAllExampleSuccessful) {
                      console.error('skipping beforeAll build, previous beforeAllExample failed');
                      return;
                    }
                    try {
                      buildScript = await execa(pmCmd, ['run', 'build'], {
                        cwd: exampleTempDir,
                      });
                      expect(buildScript.stdout).toMatch('Build completed');
                      expect(buildScript.stderr).toBe('');
                      await writeExampleLogs('build', buildScript.stdout, buildScript.stderr);
                    } catch (e) {
                      await writeExampleLogs('build', e.stdout, e.stderr);
                      await writeExampleLogs('build.exception', e.toString(), e.stack);
                      console.error('svite build failed', e);
                      throw e;
                    }

                    // start a static file server
                    try {
                      const app = new (require('koa'))();
                      app.use(require('koa-static')(path.join(exampleTempDir, 'dist')));
                      buildServer = require('http').createServer(app.callback());
                      await new Promise((r) => buildServer.listen(4001, r));

                      buildPage = await browser.newPage();
                      buildPage.on('console', (msg) => {
                        buildPageLogs.push(msg.text());
                      });
                      await buildPage.goto('http://localhost:4001', { waitUntil: 'networkidle2' });
                    } catch (e) {
                      console.error(`failed to serve build and open page for example ${example}`, e);
                      throw e;
                    }
                    beforeAllBuildSuccessful = true;
                  });

                  afterAll(async () => {
                    closeKillAll([buildScript, buildServer, buildPage]);
                    writeExampleLogs('buildPage', buildPageLogs.join('\n'));
                  });

                  describe('app', () => {
                    test('beforeAll build was successful', () => {
                      expect(beforeAllBuildSuccessful).toBe(true);
                    });
                    test('page should be loaded', () => {
                      expect(beforeAllBuildSuccessful).toBe(true);
                      expect(buildPage).toBeDefined();
                    });
                    test('should render App.svelte', async () => {
                      expect(beforeAllBuildSuccessful).toBe(true);
                      await takeExampleScreenshot(buildPage, 'buildPage');
                      await expectByPolling(async () => await getText(buildPage, '#test-div'), '__xxx__');
                    });
                    test('should not have failed requests', () => {
                      expect(beforeAllBuildSuccessful).toBe(true);
                      const has404 = buildPageLogs.some((msg) => msg.match('404'));
                      expect(has404).toBe(false);
                    });
                  });
                });

                describe('dev', () => {
                  let devPage;
                  let devServer;
                  let devServerStdErr = [];
                  let devServerStdOut = [];
                  let devPageLogs = [];
                  let beforeAllDevSuccessful = false;
                  beforeAll(async () => {
                    if (!beforeAllExampleSuccessful) {
                      console.error('skipping beforeAll dev, previous beforeAllExample failed');
                      return;
                    }
                    try {
                      devServer = execa(pmCmd, ['run', 'dev'], {
                        cwd: exampleTempDir,
                      });
                      devServer.stderr.on('data', (data) => {
                        devServerStdErr.push(data.toString());
                      });
                      devServer.stdout.on('data', (data) => {
                        devServerStdOut.push(data.toString());
                      });
                      const url = await new Promise((resolve) => {
                        const resolveLocalUrl = (data) => {
                          const str = data.toString();
                          // hack, console output may contain color code gibberish
                          // skip gibberish between localhost: and port number statting with 3
                          const match = str.match(/(http:\/\/localhost:)(?:[^3]*)(\d+)/);
                          if (match) {
                            devServer.stdout.off('data', resolveLocalUrl);
                            resolve(match[1] + match[2]);
                          }
                        };
                        devServer.stdout.on('data', resolveLocalUrl);
                      });
                      devPage = await browser.newPage();
                      devPage.on('console', (msg) => {
                        devPageLogs.push(msg.text());
                      });
                      await devPage.goto(url, { waitUntil: 'networkidle2' });
                      if (!devPageLogs.some((log) => log.indexOf('connected.') > -1)) {
                        await new Promise((resolve) => {
                          const resolveConnected = (log) => {
                            if (log.indexOf('connected.') > -1) {
                              devPage.off('console', resolveConnected);
                              resolve();
                            }
                          };
                          devPage.on('console', resolveConnected);
                        });
                      }
                    } catch (e) {
                      console.error(`failed to start devserver and open page in dev mode for example ${example}`, e);
                      throw e;
                    }
                    beforeAllDevSuccessful = true;
                  });

                  afterAll(async () => {
                    await closeKillAll([devServer, devPage]);
                    await writeExampleLogs('devServer', devServerStdOut.join('\n'), devServerStdErr.join('\n'));
                    await writeExampleLogs('devPage', devPageLogs.join('\n'));
                  });

                  describe('app', () => {
                    test('beforeAll dev was successful', () => {
                      expect(beforeAllDevSuccessful).toBe(true);
                    });
                    test('page should be loaded', () => {
                      expect(beforeAllDevSuccessful).toBe(true);
                      expect(devPage).toBeDefined();
                    });
                    test('should render App.svelte', async () => {
                      expect(beforeAllDevSuccessful).toBe(true);
                      await takeExampleScreenshot(devPage, 'devPage');
                      await expectByPolling(async () => await getText(devPage, '#test-div'), '__xxx__');
                    });

                    test('should accept update to App.svelte', async () => {
                      expect(beforeAllDevSuccessful).toBe(true);
                      if (example.indexOf('routify') > -1) {
                        await sleep(250); // let routify route update complete first
                      }
                      expect(await getText(devPage, '#test-div')).toBe('__xxx__');
                      await updateExampleFile('src/App.svelte', (c) => c.replace('__xxx__', '__yyy__'));
                      await hmrUpdateComplete(devPage, 'src/App.svelte', 10000);
                      await takeExampleScreenshot(devPage, 'devHmr');
                      expect(await getText(devPage, '#test-div')).toBe('__yyy__');
                    });

                    test('should not have failed requests', () => {
                      expect(beforeAllDevSuccessful).toBe(true);
                      const has404 = devPageLogs.some((msg) => msg.match('404'));
                      expect(has404).toBe(false);
                    });
                  });
                });
              });
            });
          }
        });
      }
    });
  }
});
