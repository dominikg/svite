/* eslint-env node,jest */
const execa = require('execa');
const fs = require('fs-extra');
const writeFileAtomic = require('write-file-atomic');
const path = require('path');
const treeKill = require('tree-kill');
const puppeteer = require('puppeteer-core');
const tempDir = path.join(__dirname, 'temp');
const sviteDir = path.join(__dirname, '..');

const sleep = (n) => new Promise((r) => setTimeout(r, n));

const msDiff = (start) => {
  const diff = process.hrtime(start);
  return diff[0] * 1000 + Math.round(diff[1] / 1e6);
};

const lastFileWriteTime = {};
const throttledWrite = async (filePath, content, wait) => {
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
  return writeFileAtomic(filePath, content);
};
const fileContentCache = {};
const updateFile = async (dir, file, replacer) => {
  const filePath = path.join(dir, file);
  const content = fileContentCache[filePath] || (await fs.readFile(filePath, 'utf-8'));
  const newContent = replacer(content);
  await throttledWrite(filePath, newContent, 100);
  fileContentCache[filePath] = newContent;
};

const updateFileAndWaitForHmrComplete = async (dir, file, replacer, page) => {
  await updateFile(dir, file, replacer);
  await hmrUpdateComplete(page, file, 10000);
};

const deleteDir = async (dir) => {
  try {
    await fs.remove(dir);
  } catch (e) {
    console.error(`failed to delete ${dir}`, e);
    throw e;
  }
};

const cleanDir = async (dir) => {
  await deleteDir(dir);
  await fs.mkdirp(dir);
};

const guessChromePath = async () => {
  const locations = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ...[process.env['PROGRAMFILES(X86)'], process.env.PROGRAMFILES, process.env.LOCALAPPDATA]
      .filter((prefix) => prefix != null && prefix.length > 0)
      .map((prefix) => prefix + '\\Google\\Chrome\\Application\\chrome.exe'),
  ];
  for (let path of locations) {
    try {
      if (await fs.exists(path)) {
        return path;
      }
    } catch (e) {
      //ignore
    }
  }
};

const launchPuppeteer = async () => {
  const args = ['--headless', '--disable-gpu', '--single-process', '--no-zygote', '--no-sandbox'];
  if (process.env.CI) {
    args.push('--disable-setuid-sandbox', '--disable-dev-shm-usage');
  }
  const executablePath = process.env.CHROME_BIN || (await guessChromePath());
  if (!executablePath) {
    throw new Error('failed to identify chrome executable path. set CHROME_BIN env variable');
  }
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args,
  });
  return browser;
};

const hmrUpdateComplete = async (page, file, timeout) => {
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
};

const closeKillAll = async (thingsToKill) => {
  for (let thing of thingsToKill) {
    await closeKill(thing);
  }
};

const closeKill = async (thing) => {
  if (!thing) {
    return;
  }
  if (typeof thing.close === 'function') {
    await thing.close();
  }
  if (thing.pid != null) {
    await killtree(thing.pid);
  }
};

const killtree = async (pid) => {
  if (!pid) {
    return;
  }
  await new Promise((resolve, reject) => {
    treeKill(pid, (err) => {
      if (err) {
        console.error('kill failed', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const killProcessTreeOnSignals = () => {
  function killAndExit() {
    try {
      killtree(process.pid);
    } catch (e) {
      // ignore
    }
    process.exit(1);
  }

  ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'].forEach(
    (sig) => {
      process.once(sig, () => killAndExit());
    },
  );
};

const packageSvite = async () => {
  try {
    const packCmd = await execa('npm', ['pack', sviteDir], { cwd: tempDir });
    const packageName = packCmd.stdout;
    const packageFilePath = path.join(tempDir, packageName);
    const packageExists = await fs.exists(packageFilePath);
    if (packageExists) {
      return packageFilePath;
    } else {
      throw new Error('pack returned with 0 but packageFile does not exist');
    }
  } catch (e) {
    console.error('pack failed', e);
    await writeLogs(tempDir, 'pack', e.stdout, e.stderr);
    await writeLogs(tempDir, 'pack.exception', e.toString(), e.stack);
    throw e;
  }
};

// poll until it updates
const expectByPolling = async (poll, expected) => {
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
};

const getEl = async (page, selectorOrEl) => {
  return typeof selectorOrEl === 'string' ? await page.$(selectorOrEl) : selectorOrEl;
};

const getText = async (page, selectorOrEl) => {
  const el = await getEl(page, selectorOrEl);
  return el ? el.evaluate((el) => el.textContent) : null;
};

const writeLogs = async (dir, name, out, err) => {
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
};

const takeScreenshot = async (dir, page, name) => {
  const screenshotDir = path.join(dir, 'screenshots');
  await fs.mkdirp(screenshotDir);
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), type: 'png' });
};

module.exports = {
  cleanDir,
  closeKill,
  closeKillAll,
  deleteDir,
  expectByPolling,
  getEl,
  getText,
  hmrUpdateComplete,
  killtree,
  killProcessTreeOnSignals,
  msDiff,
  launchPuppeteer,
  packageSvite,
  sleep,
  takeScreenshot,
  tempDir,
  throttledWrite,
  updateFile,
  updateFileAndWaitForHmrComplete,
  writeLogs,
};
