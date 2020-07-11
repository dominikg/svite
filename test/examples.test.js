const fs = require('fs-extra');
const path = require('path');
const execa = require('execa');
const puppeteer = require('puppeteer');

jest.setTimeout(60000);

const tempDir = path.join(__dirname, 'temp');

let devServer;
let browser;
let page;

const getEl = async (selectorOrEl) => {
  return typeof selectorOrEl === 'string' ? await page.$(selectorOrEl) : selectorOrEl;
};

const getText = async (selectorOrEl) => {
  const el = await getEl(selectorOrEl);
  return el ? el.evaluate((el) => el.textContent) : null;
};

async function deleteTempDir(dir) {
  try {
    await fs.remove(dir);
  } catch (e) {
    console.error(`failed to delete ${dir}`, e);
    throw e;
  }
}
describe('examples', () => {
  beforeAll(async () => {
    await fs.mkdirp(tempDir);
  });

  const examples = ['minimal', 'postcss-tailwind', 'routify-mdsvex'];
  for (let example of examples) {
    const exampleDir = path.join(__dirname, '..', 'examples', example);

    describe(example, () => {
      const exampleTempDir = path.join(tempDir, example);
      const binPath = path.join(exampleTempDir, 'node_modules', '.bin', 'svite');
      const updateExampleFile = updateFile.bind(null, exampleTempDir);
      const browserLogs = [];
      const serverLogs = [];
      beforeAll(async () => {
        try {
          await deleteTempDir(exampleTempDir);
          await fs.mkdirp(exampleTempDir);
          await fs.copy(exampleDir, exampleTempDir, {
            filter: (file) => !/dist|node_modules/.test(file),
          });

          await updateExampleFile('package.json', (c) =>
            c.replace(/"svite": ?"[^"]+"/, '"svite": "file:../../../../svite/"').replace(/"name": ?"([^"]+)"/, '"name": "$1-test"'),
          );
          await updateExampleFile('src/App.svelte', (c) => `${c}\n<div id="test-div">__xxx__</div>`);
        } catch (e) {
          console.error(e);
          throw e;
        }
        try {
          await execa('npm', ['install'], { cwd: exampleTempDir });
        } catch (e) {
          console.error(`npm install failed in ${exampleTempDir}`, e);
          throw e;
        }
      });

      afterAll(async () => {
        //await deleteTempDir(exampleTempDir);
        if (browser) await browser.close();
        if (devServer) {
          devServer.kill('SIGTERM', {
            forceKillAfterTimeout: 2000,
          });
        }
        await fs.writeFile(path.join(exampleTempDir, 'browser.log'), browserLogs.join('\n'));
        await fs.writeFile(path.join(exampleTempDir, 'server.log'), serverLogs.join('\n'));
      });
      describe('svite', () => {
        beforeAll(async () => {
          browser = await puppeteer.launch(process.env.CI ? { args: ['--no-sandbox', '--disable-setuid-sandbox'] } : {});
        });

        function declareTests(isBuild) {
          test('should render App.svelte', async () => {
            //TODO make this work
            await expectByPolling(async () => await getText('#test-div'), '__xxx__');
          });

          test('should not have failed requests', () => {
            const has404 = browserLogs.some((msg) => msg.match('404'));
            expect(has404).toBe(false);
          });

          if (!isBuild) {
            describe('hmr', () => {
              test('should accept update to App.svelte', async () => {
                expect(await getText('#test-div')).toBe('__xxx__');
                await updateExampleFile('src/App.svelte', (c) => c.replace('__xxx__', '__yyy__'));
                await hmrUpdateComplete('src/App.svelte', 250);
                expect(await getText('#test-div')).toBe('__yyy__');
              });
            });
          }
        }

        // test build first since we are going to edit the fixtures when testing dev
        // no need to run build tests when testing service worker mode since it's
        // dev only
        if (!process.env.USE_SW) {
          describe('build', () => {
            let staticServer;
            beforeAll(async () => {
              try {
                const buildOutput = await execa(binPath, ['build'], {
                  cwd: exampleTempDir,
                });
                expect(buildOutput.stdout).toMatch('Build completed');
                expect(buildOutput.stderr).toBe('');
              } catch (e) {
                console.error('vite build failed', e);
                throw e;
              }
            });

            afterAll(() => {
              if (staticServer) staticServer.close();
            });

            describe('app', () => {
              beforeAll(async () => {
                // start a static file server
                try {
                  const app = new (require('koa'))();
                  app.use(require('koa-static')(path.join(exampleTempDir, 'dist')));
                  staticServer = require('http').createServer(app.callback());
                  await new Promise((r) => staticServer.listen(4001, r));

                  page = await browser.newPage();
                  await page.goto('http://localhost:4001', { waitUntil: 'networkidle2' });
                  await page.screenshot({ path: path.join(exampleTempDir, 'built.png'), type: 'png' });
                } catch (e) {
                  console.error(`failed to serve build and open page for example ${example}`, e);
                  throw e;
                }
              });

              declareTests(true);
            });
          });
        }

        describe('dev', () => {
          beforeAll(async () => {
            browserLogs.push('------------------- dev -------------------------');
            try {
              devServer = execa(binPath, {
                cwd: exampleTempDir,
              });
              devServer.stderr.on('data', (data) => {
                serverLogs.push(`stderr: ${data.toString()}`);
              });
              devServer.stdout.on('data', (data) => {
                serverLogs.push(`stdout: ${data.toString()}`);
              });
              const url = await new Promise((resolve) => {
                const resolveLocalUrl = (data) => {
                  const match = data.toString().match(/http:\/\/localhost:\d+/);
                  if (match) {
                    devServer.stdout.off('data', resolveLocalUrl);
                    resolve(match[0]);
                  }
                };
                devServer.stdout.on('data', resolveLocalUrl);
              });

              page = await browser.newPage();
              page.on('console', (msg) => {
                browserLogs.push(msg.text());
              });
              await page.goto(url, { waitUntil: 'networkidle2' });
            } catch (e) {
              console.error(`failed to start devserver and open page in dev mode for example ${example}`, e);
              throw e;
            }
          });
          describe('app', () => {
            declareTests(false);
          });
        });
      });
    });
  }
});

async function updateFile(dir, file, replacer) {
  const compPath = path.join(dir, file);
  const content = await fs.readFile(compPath, 'utf-8');
  const newContent = replacer(content);
  await throttledWrite(compPath, newContent, 100);
}

async function hmrUpdateComplete(file, timeout) {
  return new Promise(function (resolve, reject) {
    var timer;
    function listener(data) {
      const text = data.text();
      if (text.indexOf(file) > -1) {
        clearTimeout(timer);
        page.off('console', listener);
        resolve();
      }
    }
    page.on('console', listener);
    timer = setTimeout(function () {
      page.off('console', listener);
      reject(new Error(`timeout after ${timeout}ms waiting for hmr update of ${file} to complete`));
    }, timeout);
  });
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

function msDiff(start) {
  const diff = process.hrtime(start);
  return diff[0] * 1000 + Math.round(diff[1] / 1e6);
}

const lastFileWriteTime = {};
async function throttledWrite(filePath, content, wait) {
  if (wait) {
    const lastTime = lastFileWriteTime[filePath];
    if (lastTime) {
      const elapsed = msDiff(lastTime);
      if (wait > elapsed) {
        const n = wait - elapsed;
        await sleep(n);
      }
    }
  }
  lastFileWriteTime[filePath] = process.hrtime();
  return fs.writeFile(filePath, content);
}
const sleep = (n) => new Promise((r) => setTimeout(r, n));
