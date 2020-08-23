const fs = require('fs-extra');
const path = require('path');
const execa = require('execa');

const { closeKillAll, closeKill, throttledWrite, deleteDir, launchPuppeteer, sleep, hmrUpdateComplete } = require('./utils');

jest.setTimeout(35000);

const tempDir = path.join(__dirname, 'temp');
const sviteDir = path.join(__dirname, '..');
const examples = ['minimal', 'postcss-tailwind', 'routify-mdsvex', 'svelte-preprocess-auto'];
const pmOptions = ['npm', 'pnpm', 'yarn', 'yarn2'];
const scriptOptions = ['javascript', 'typescript'];

describe('examples', () => {
  let svitePackage;
  let browser;
  beforeAll(async () => {
    await cleanTempDir();
    svitePackage = await createTestPackage();
    browser = await launchPuppeteer();
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

              beforeAll(async () => {
                try {
                  await deleteDir(exampleTempDir);
                  await fs.mkdirp(exampleTempDir);
                  await fs.copy(exampleDir, exampleTempDir, {
                    filter: (file) => !/dist|dist-ssr|node_modules|package-lock\.json/.test(file),
                  });
                  const testPackageName = `svite-test-${script}-${pm}-${example}`;
                  await updateExampleFile('package.json', (c) =>
                    c
                      .replace(/"svite": ?"[^"]+"/, `"svite": "${svitePackage}"`)
                      .replace(/"name": ?"([^"]+)"/, `"name": "${testPackageName}","private":true,"license":"UNLICENSED"`),
                  );
                  await updateExampleFile('src/App.svelte', (c) => `${c}\n<div id="test-div">__xxx__</div>`);
                } catch (e) {
                  console.error(e);
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
                      await fs.writeFile(path.join(exampleTempDir, '.npmrc'), `cache="${pmCacheDir}"`);
                      break;
                    case 'pnpm':
                      await fs.writeFile(path.join(exampleTempDir, '.npmrc'), `store-dir="${pmCacheDir}"`);
                      break;
                    case 'yarn':
                      await fs.writeFile(path.join(exampleTempDir, '.yarnrc'), `cache-folder "${pmCacheDir}"`);
                      break;
                    case 'yarn2':
                      // don't write file, it was already created by set version berry above
                      await execa(pmCmd, ['config', 'set', 'cacheFolder', pmCacheDir], { cwd: exampleTempDir });
                      break;
                    default:
                      throw new Error('you must setup a cache configuration for pm ' + pm);
                  }

                  installCmd = await execa(pmCmd, ['install'], { cwd: exampleTempDir });
                } catch (e) {
                  console.error(`${pm} install failed in ${exampleTempDir}`, e);
                  throw e;
                } finally {
                  if (installCmd) {
                    await writeExampleLogs('install', installCmd.stdout, installCmd.stderr);
                  }
                }
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
                  beforeAll(async () => {
                    try {
                      buildScript = await execa(pmCmd, ['run', 'build'], {
                        cwd: exampleTempDir,
                      });
                      expect(buildScript.stdout).toMatch('Build completed');
                      expect(buildScript.stderr).toBe('');
                    } catch (e) {
                      console.error('svite build failed', e);
                      throw e;
                    } finally {
                      if (buildScript) {
                        await writeExampleLogs('build', buildScript.stdout, buildScript.stderr);
                      }
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
                  });

                  afterAll(async () => {
                    closeKillAll([buildScript, buildServer, buildPage]);
                    writeExampleLogs('buildPage', buildPageLogs.join('\n'));
                  });

                  describe('app', () => {
                    test('page should be loaded', () => {
                      expect(buildPage).toBeDefined();
                    });
                    test('should render App.svelte', async () => {
                      await takeExampleScreenshot(buildPage, 'buildPage');
                      await expectByPolling(async () => await getText(buildPage, '#test-div'), '__xxx__');
                    });
                    test('should not have failed requests', () => {
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
                  beforeAll(async () => {
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
                  });

                  afterAll(async () => {
                    await closeKillAll([devServer, devPage]);
                    await writeExampleLogs('devServer', devServerStdOut.join('\n'), devServerStdErr.join('\n'));
                    await writeExampleLogs('devPage', devPageLogs.join('\n'));
                  });

                  describe('app', () => {
                    test('page should be loaded', () => {
                      expect(devPage).toBeDefined();
                    });
                    test('should render App.svelte', async () => {
                      await takeExampleScreenshot(devPage, 'devPage');
                      await expectByPolling(async () => await getText(devPage, '#test-div'), '__xxx__');
                    });

                    test('should accept update to App.svelte', async () => {
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

async function updateFile(dir, file, replacer) {
  const compPath = path.join(dir, file);
  const content = await fs.readFile(compPath, 'utf-8');
  const newContent = replacer(content);
  await throttledWrite(compPath, newContent, 100);
}

// poll until it updates
async function expectByPolling(poll, expected) {
  const maxTries = 20;
  for (let tries = 0; tries < maxTries; tries++) {
    const actual = (await poll()) || '';
    if (actual.indexOf(expected) > -1 || tries === maxTries - 1) {
      expect(actual).toMatch(expected);
      break;
    } else {
      await sleep(50);
    }
  }
}

const getEl = async (page, selectorOrEl) => {
  return typeof selectorOrEl === 'string' ? await page.$(selectorOrEl) : selectorOrEl;
};

const getText = async (page, selectorOrEl) => {
  const el = await getEl(page, selectorOrEl);
  return el ? el.evaluate((el) => el.textContent) : null;
};

process.once('SIGINT', () => closeKill(process));
process.once('SIGTERM', () => closeKill(process));

async function cleanTempDir() {
  await deleteDir(tempDir);
  await fs.mkdirp(tempDir);
}

async function createTestPackage() {
  try {
    const packCmd = await execa('npm', ['pack', sviteDir], { cwd: tempDir });
    return path.join(tempDir, packCmd.stdout);
  } catch (e) {
    console.error('pack failed', e);
    throw e;
  }
}

async function writeLogs(dir, name, out, err) {
  try {
    const logDir = path.join(dir, 'logs');
    await fs.mkdirp(logDir);
    if (!err) {
      await fs.writeFile(path.join(logDir, `${name}.log`), out);
    } else {
      await fs.writeFile(path.join(logDir, `${name}.out.log`), out);
      await fs.writeFile(path.join(logDir, `${name}.err.log`), err);
    }
  } catch (e) {
    console.error(`writing ${name} logs failed in ${dir}`, e);
  }
}

async function takeScreenshot(dir, page, name) {
  const screenshotDir = path.join(dir, 'screenshots');
  await fs.mkdirp(screenshotDir);

  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), type: 'png' });
}
