const fs = require('fs-extra');
const path = require('path');
const execa = require('execa');

const {
  cleanDir,
  closeKill,
  closeKillAll,
  expectByPolling,
  findUnexpectedBuildErrorMessages,
  getEl,
  getText,
  launchPuppeteer,
  packageSvite,
  sleep,
  takeScreenshot,
  tempDir,
  updateFile,
  updateFileAndWaitForHmrComplete,
  writeLogs,
} = require('./utils');

jest.setTimeout(process.env.CI ? 120000 : 60000);

const getComputedColor = async (page, selectorOrEl) => {
  return (await getEl(page, selectorOrEl)).evaluate((el) => getComputedStyle(el).color);
};

describe('svite', () => {
  let svitePackage;
  let browser;
  let beforeAllSuccessful = false;
  beforeAll(async () => {
    try {
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
  describe('hmr-test', () => {
    const exampleDir = path.join(__dirname, 'hmr-test');
    const exampleTempDir = path.join(tempDir, 'hmr-test');
    const updateExampleFile = updateFile.bind(null, exampleTempDir);
    const updateExampleFileAndWaitForHmrComplete = updateFileAndWaitForHmrComplete.bind(null, exampleTempDir);
    const writeExampleLogs = writeLogs.bind(null, exampleTempDir);
    const takeExampleScreenshot = takeScreenshot.bind(null, exampleTempDir);
    const binPath = path.join(exampleTempDir, 'node_modules', '.bin', 'svite');
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
        const testPackageName = `svite-hmr-test`;
        await updateExampleFile('package.json', (c) =>
          c
            .replace(/"svite": ?"[^"]+"/, `"svite": "${svitePackage.replace(/\\/g, '\\\\')}"`)
            .replace(/"name": ?"([^"]+)"/, `"name": "${testPackageName}","private":true,"license":"UNLICENSED"`)
            .replace('@dependency/dependency', '@dependency/dependency-test'),
        );
        await updateExampleFile('vite.config.js', (c) => c.replace('@dependency/dependency', '@dependency/dependency-test'), true);
        await updateExampleFile('src/App.svelte', (c) => c.replace('@dependency/dependency', '@dependency/dependency-test'), true);
        await updateExampleFile('dependency/package.json', (c) => c.replace(/"name": ?"([^"]+)"/, '"name": "$1-test"'), true);
      } catch (e) {
        console.error('failed to setup test project in dir ' + exampleTempDir, e);
        throw e;
      }
      try {
        const npmCacheDir = `${path.join(__dirname, 'cache', 'npm')}`;
        await fs.mkdirp(npmCacheDir);
        await fs.writeFile(path.join(exampleTempDir, '.npmrc'), `cache=${npmCacheDir}`);
        installCmd = await execa('npm', ['install'], { cwd: exampleTempDir });
        await writeExampleLogs('install', installCmd.stdout, installCmd.stderr);
      } catch (e) {
        await writeExampleLogs('install', e.stdout, e.stderr);
        await writeExampleLogs('install.exception', e.toString(), e.stack);
        console.error(`npm install failed in ${exampleTempDir}`, e);
        throw e;
      }
      beforeAllExampleSuccessful = true;
    });

    afterAll(async () => {
      await closeKillAll([installCmd]);
    });

    // test build first since we are going to edit the fixtures when testing dev

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
          buildScript = await execa(binPath, ['build'], {
            cwd: exampleTempDir,
          });
          expect(buildScript.stdout).toMatch('Build completed');
          const unexpectedBuildErrorMessages = findUnexpectedBuildErrorMessages(buildScript.stderr);
          expect(unexpectedBuildErrorMessages).toEqual([]);
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
          console.error(`failed to serve build and open page for hmr-test`, e);
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
        test('should render App', async () => {
          expect(beforeAllBuildSuccessful).toBe(true);
          await takeExampleScreenshot(buildPage, 'buildPage');
          expect(await getText(buildPage, '#app-header')).toBe('Test-App');
        });
        test('should render static import', async () => {
          expect(beforeAllBuildSuccessful).toBe(true);
          expect(await getText(buildPage, '#static-import .label')).toBe('static-import');
        });
        test('should render dependency import', async () => {
          expect(beforeAllBuildSuccessful).toBe(true);
          expect(await getText(buildPage, '#dependency-import .label')).toBe('dependency-import');
        });
        test('should render dynamic import', async () => {
          expect(beforeAllBuildSuccessful).toBe(true);
          expect(await getEl(buildPage, '#dynamic-import')).toBe(null);
          let dynamicImportButton = await getEl(buildPage, '#button-import-dynamic');
          expect(dynamicImportButton).toBeDefined();
          await dynamicImportButton.click();
          await expectByPolling(() => getText(buildPage, '#dynamic-import .label'), 'dynamic-import');
        });
        test('should not have failed requests', async () => {
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
          devServer = execa(binPath, ['dev'], {
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
          console.error(`failed to start devserver and open page in dev mode for hmr-test`, e);
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
        test('should render App', async () => {
          expect(beforeAllDevSuccessful).toBe(true);
          await takeExampleScreenshot(devPage, 'devPage');
          expect(await getText(devPage, '#app-header')).toBe('Test-App');
        });
        test('should render static import', async () => {
          expect(beforeAllDevSuccessful).toBe(true);
          expect(await getText(devPage, '#static-import .label')).toBe('static-import');
        });
        test('should render dependency import', async () => {
          expect(beforeAllDevSuccessful).toBe(true);
          expect(await getText(devPage, '#dependency-import .label')).toBe('dependency-import');
        });
        test('should render dynamic import', async () => {
          expect(beforeAllDevSuccessful).toBe(true);
          expect(await getEl(devPage, '#dynamic-import')).toBe(null);
          let dynamicImportButton = await getEl(devPage, '#button-import-dynamic');
          expect(dynamicImportButton).toBeDefined();
          await dynamicImportButton.click();
          await expectByPolling(() => getText(devPage, '#dynamic-import .label'), 'dynamic-import');
        });
        test('should not have failed requests', async () => {
          expect(beforeAllDevSuccessful).toBe(true);
          const has404 = devPageLogs.some((msg) => msg.match('404'));
          expect(has404).toBe(false);
        });

        describe('hmr', () => {
          const updateHmrTest = updateExampleFileAndWaitForHmrComplete.bind(null, 'src/components/HmrTest.svelte');
          const updateApp = updateExampleFileAndWaitForHmrComplete.bind(null, 'src/App.svelte');
          const updateStore = updateExampleFileAndWaitForHmrComplete.bind(null, 'src/stores/hmr-stores.js');
          test('should have expected initial state', async () => {
            // initial state, both counters 0, both labels red
            expect(beforeAllDevSuccessful).toBe(true);
            expect(await getText(devPage, `#hmr-test-1 .counter`)).toBe('0');
            expect(await getText(devPage, `#hmr-test-2 .counter`)).toBe('0');
            expect(await getText(devPage, `#hmr-test-1 .label`)).toBe('hmr-test');
            expect(await getText(devPage, `#hmr-test-2 .label`)).toBe('hmr-test');
            expect(await getComputedColor(devPage, `#hmr-test-1 .label`)).toBe('rgb(255, 0, 0)');
            expect(await getComputedColor(devPage, `#hmr-test-2 .label`)).toBe('rgb(255, 0, 0)');
          });
          test('should have working increment button', async () => {
            expect(beforeAllDevSuccessful).toBe(true);
            // increment counter of one instance to have local state to verify after hmr updates
            (await getEl(devPage, `#hmr-test-1 .increment`)).click();
            await sleep(50);

            // counter1 = 1, counter2 = 0
            expect(await getText(devPage, `#hmr-test-1 .counter`)).toBe('1');
            expect(await getText(devPage, `#hmr-test-2 .counter`)).toBe('0');
          });
          test('should apply css changes in HmrTest.svelte', async () => {
            expect(beforeAllDevSuccessful).toBe(true);
            // update style, change label color from red to green
            await updateHmrTest((content) => content.replace('color: red', 'color: green'), devPage);

            // counter state should remain
            expect(await getText(devPage, `#hmr-test-1 .counter`)).toBe('1');
            expect(await getText(devPage, `#hmr-test-2 .counter`)).toBe('0');

            // color should have changed
            expect(await getComputedColor(devPage, `#hmr-test-1 .label`)).toBe('rgb(0, 128, 0)');
            expect(await getComputedColor(devPage, `#hmr-test-2 .label`)).toBe('rgb(0, 128, 0)');
          });
          test('should apply js change in HmrTest.svelte ', async () => {
            expect(beforeAllDevSuccessful).toBe(true);
            // update script, change label value
            await updateHmrTest((content) => content.replace("const label = 'hmr-test';", "const label = 'hmr-test-updated';"), devPage);
            expect(await getText(devPage, `#hmr-test-1 .label`)).toBe('hmr-test-updated');
            expect(await getText(devPage, `#hmr-test-2 .label`)).toBe('hmr-test-updated');
          });
          test('should keep state of external store intact on change of HmrTest.svelte', async () => {
            expect(beforeAllDevSuccessful).toBe(true);
            // counter state should remain
            await updateHmrTest((content) => `${content}\n<span/>\n`, devPage);
            await expect(await getText(devPage, `#hmr-test-1 .counter`)).toBe('1');
            await expect(await getText(devPage, `#hmr-test-2 .counter`)).toBe('0');
          });
          test('should preserve state of external store used by HmrTest.svelte when editing App.svelte', async () => {
            expect(beforeAllDevSuccessful).toBe(true);
            // update App, add a new instance of HmrTest
            await updateApp((content) => `${content}\n<HmrTest id="hmr-test-3"/>`, devPage);
            // counter state is preserved
            await expect(await getText(devPage, `#hmr-test-1 .counter`)).toBe('1');
            await expect(await getText(devPage, `#hmr-test-2 .counter`)).toBe('0');
            // a third instance has been added
            await expect(await getText(devPage, `#hmr-test-3 .counter`)).toBe('0');
          });
          test('should preserve state of store when editing hmr-stores.js', async () => {
            expect(beforeAllDevSuccessful).toBe(true);
            // change state
            (await getEl(devPage, `#hmr-test-2 .increment`)).click();
            await sleep(50);
            // update store
            await updateStore((content) => `${content}\n/*trigger change*/\n`, devPage);
            // counter state is preserved
            await expect(await getText(devPage, `#hmr-test-1 .counter`)).toBe('1');
            await expect(await getText(devPage, `#hmr-test-2 .counter`)).toBe('1');
            // a third instance has been added
            await expect(await getText(devPage, `#hmr-test-3 .counter`)).toBe('0');
          });
        });
      });
    });
  });
});
