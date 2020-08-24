const fs = require('fs-extra');
const path = require('path');
const execa = require('execa');

const { sleep, throttledWrite, deleteDir, closeKillAll, launchPuppeteer, hmrUpdateComplete } = require('./utils');

jest.setTimeout(process.env.CI ? 120000 : 60000);

const testAppDir = path.join(__dirname, 'app');
const tempDir = path.join(__dirname, 'temp/app');
const binPath = path.join(tempDir, 'node_modules', '.bin', 'svite');

// global refs so we can stop them
let npmInstall;
let buildServer;
let buildScript;
let devServer;
let browser;
let page;

const browserLogs = [];
const serverLogs = [];

const getEl = async (selectorOrEl) => {
  return typeof selectorOrEl === 'string' ? await page.$(selectorOrEl) : selectorOrEl;
};

const getText = async (selectorOrEl) => {
  const el = await getEl(selectorOrEl);
  return el ? el.evaluate((el) => el.textContent) : null;
};

const getComputedColor = async (selectorOrEl) => {
  return (await getEl(selectorOrEl)).evaluate((el) => getComputedStyle(el).color);
};

beforeAll(async () => {
  try {
    await deleteDir(tempDir);
    await fs.mkdirp(tempDir);
    await fs.copy(testAppDir, tempDir, {
      filter: (file) => !/dist|node_modules/.test(file),
    });
    await updateFile(
      'package.json',
      (c) =>
        c
          .replace(/"svite": ?"[^"]+"/, '"svite": "file:../../../../svite/"')
          .replace(/"name": ?"([^"]+)"/, '"name": "$1-test"')
          .replace('@dependency/dependency', '@dependency/dependency-test'),
      true,
    );
    await updateFile('vite.config.js', (c) => c.replace('@dependency/dependency', '@dependency/dependency-test'), true);
    await updateFile('src/App.svelte', (c) => c.replace('@dependency/dependency', '@dependency/dependency-test'), true);
    await updateFile('dependency/package.json', (c) => c.replace(/"name": ?"([^"]+)"/, '"name": "$1-test"'), true);
  } catch (e) {
    console.error('setup failed', e);
    throw e;
  }

  try {
    npmInstall = await execa('npm', ['install'], { cwd: tempDir });
  } catch (e) {
    console.error(`npm install failed in ${tempDir}`, e);
    throw e;
  }
});

afterAll(async () => {
  closeKillAll([browser, devServer]);
  await fs.writeFile(path.join(tempDir, 'browser.log'), browserLogs.join('\n'));
  await fs.writeFile(path.join(tempDir, 'server.log'), serverLogs.join('\n'));
});

describe('svite', () => {
  beforeAll(async () => {
    browser = await launchPuppeteer();
  });

  function declareTests(isBuild) {
    test('should render App', async () => {
      expect(await getText('#app-header')).toBe('Test-App');
    });
    test('should render static import', async () => {
      expect(await getText('#static-import .label')).toBe('static-import');
    });
    test('should render dependency import', async () => {
      expect(await getText('#dependency-import .label')).toBe('dependency-import');
    });
    test('should render dynamic import', async () => {
      expect(await getEl('#dynamic-import')).toBe(null);
      let dynamicImportButton = await getEl('#button-import-dynamic');
      expect(dynamicImportButton).toBeDefined();
      await dynamicImportButton.click();
      await expectByPolling(() => getText('#dynamic-import .label'), 'dynamic-import');
    });
    test('should not have failed requests', async () => {
      const has404 = browserLogs.some((msg) => msg.match('404'));
      expect(has404).toBe(false);
    });

    if (!isBuild) {
      describe('hmr', () => {
        const updateHmrTest = updateFile.bind(null, 'src/components/HmrTest.svelte');
        const updateApp = updateFile.bind(null, 'src/App.svelte');
        const updateStore = updateFile.bind(null, 'src/stores/hmr-stores.js');
        test('should have expected initial state', async () => {
          // initial state, both counters 0, both labels red
          expect(await getText(`#hmr-test-1 .counter`)).toBe('0');
          expect(await getText(`#hmr-test-2 .counter`)).toBe('0');
          expect(await getText(`#hmr-test-1 .label`)).toBe('hmr-test');
          expect(await getText(`#hmr-test-2 .label`)).toBe('hmr-test');
          expect(await getComputedColor(`#hmr-test-1 .label`)).toBe('rgb(255, 0, 0)');
          expect(await getComputedColor(`#hmr-test-2 .label`)).toBe('rgb(255, 0, 0)');
        });
        test('should have working increment button', async () => {
          // increment counter of one instance to have local state to verify after hmr updates
          (await getEl(`#hmr-test-1 .increment`)).click();
          await sleep(50);

          // counter1 = 1, counter2 = 0
          expect(await getText(`#hmr-test-1 .counter`)).toBe('1');
          expect(await getText(`#hmr-test-2 .counter`)).toBe('0');
        });
        test('should apply css changes in HmrTest.svelte', async () => {
          // update style, change label color from red to green
          await updateHmrTest((content) => content.replace('color: red', 'color: green'));

          // counter state should remain
          expect(await getText(`#hmr-test-1 .counter`)).toBe('1');
          expect(await getText(`#hmr-test-2 .counter`)).toBe('0');

          // color should have changed
          expect(await getComputedColor(`#hmr-test-1 .label`)).toBe('rgb(0, 128, 0)');
          expect(await getComputedColor(`#hmr-test-2 .label`)).toBe('rgb(0, 128, 0)');
        });
        test('should apply js change in HmrTest.svelte ', async () => {
          // update script, change label value
          await updateHmrTest((content) => content.replace("const label = 'hmr-test';", "const label = 'hmr-test-updated';"));
          expect(await getText(`#hmr-test-1 .label`)).toBe('hmr-test-updated');
          expect(await getText(`#hmr-test-2 .label`)).toBe('hmr-test-updated');
        });
        test('should keep state of external store intact on change of HmrTest.svelte', async () => {
          // counter state should remain
          await updateHmrTest((content) => `${content}\n<span/>\n`);
          await expect(await getText(`#hmr-test-1 .counter`)).toBe('1');
          await expect(await getText(`#hmr-test-2 .counter`)).toBe('0');
        });
        test('should preserve state of external store used by HmrTest.svelte when editing App.svelte', async () => {
          // update App, add a new instance of HmrTest
          await updateApp((content) => `${content}\n<HmrTest id="hmr-test-3"/>`);
          // counter state is preserved
          await expect(await getText(`#hmr-test-1 .counter`)).toBe('1');
          await expect(await getText(`#hmr-test-2 .counter`)).toBe('0');
          // a third instance has been added
          await expect(await getText(`#hmr-test-3 .counter`)).toBe('0');
        });
        test('should preserve state of store when editing hmr-stores.js', async () => {
          // change state
          (await getEl(`#hmr-test-2 .increment`)).click();
          await sleep(50);
          // update store
          await updateStore((content) => `${content}\n/*trigger change*/\n`);
          // counter state is preserved
          await expect(await getText(`#hmr-test-1 .counter`)).toBe('1');
          await expect(await getText(`#hmr-test-2 .counter`)).toBe('1');
          // a third instance has been added
          await expect(await getText(`#hmr-test-3 .counter`)).toBe('0');
        });
      });
    }
  }

  // test build first since we are going to edit the fixtures when testing dev
  // no need to run build tests when testing service worker mode since it's
  // dev only
  if (!process.env.USE_SW) {
    describe('build', () => {
      beforeAll(async () => {
        try {
          buildScript = await execa(binPath, ['build'], {
            cwd: tempDir,
          });
          expect(buildScript.stdout).toMatch('Build completed');
          expect(buildScript.stderr).toBe('');
        } catch (e) {
          console.error(`svite build failed`, e);
          throw e;
        }
      });

      afterAll(async () => {
        await closeKillAll([buildServer, buildScript]);
      });

      describe('app', () => {
        beforeAll(async () => {
          try {
            // start a static file server
            const app = new (require('koa'))();
            app.use(require('koa-static')(path.join(tempDir, 'dist')));
            buildServer = require('http').createServer(app.callback());
            await new Promise((r) => buildServer.listen(4001, r));

            page = await browser.newPage();
            await page.goto('http://localhost:4001');
          } catch (e) {
            console.error(`failed to serve build and open page`, e);
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
          cwd: tempDir,
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
        console.error(`failed to start devserver and open page in dev mode`, e);
        throw e;
      }
    });
    describe('app', () => {
      declareTests(false);
    });
  });
});

const fileContentCache = {};
async function updateFile(file, replacer, noHmrWait) {
  const compPath = path.join(tempDir, file);
  const content = fileContentCache[file] || (await fs.readFile(compPath, 'utf-8'));
  const newContent = replacer(content);
  await throttledWrite(compPath, newContent, 100);
  fileContentCache[file] = newContent;
  if (!noHmrWait) {
    await hmrUpdateComplete(page, file, 500);
  }
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

const killAll = () => {
  closeKillAll([npmInstall, buildServer, buildScript, devServer, page, browser, process]);
};

process.once('SIGINT', () => killAll());
process.once('SIGTERM', () => killAll());
