/* eslint-env node */
const fs = require('fs-extra');
const treeKill = require('tree-kill');
const puppeteer = require('puppeteer');

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
  return fs.writeFile(filePath, content);
};

const deleteDir = async (dir) => {
  try {
    await fs.remove(dir);
  } catch (e) {
    console.error(`failed to delete ${dir}`, e);
    throw e;
  }
};

const launchPuppeteer = async () => {
  const args = ['--headless', '--disable-gpu', '--single-process', '--no-zygote', '--no-sandbox'];
  if (process.env.CI) {
    args.push('--disable-setuid-sandbox');
  }
  const browser = await puppeteer.launch({ args });
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

module.exports = {
  killtree,
  sleep,
  msDiff,
  throttledWrite,
  deleteDir,
  launchPuppeteer,
  hmrUpdateComplete,
  closeKill,
  closeKillAll,
};
