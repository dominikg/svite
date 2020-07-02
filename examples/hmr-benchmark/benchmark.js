/* eslint-env node */
const fs = require('fs').promises;
const path = require('path');
const execa = require('execa');
const puppeteer = require('puppeteer');
const del = require('del');
const si = require('systeminformation');

const outputDir = path.join(__dirname, 'dist');
const hmrTriggerFile = path.join(__dirname, 'src/App.svelte');

const argv = require('minimist')(process.argv.slice(2), {});
if (argv.h || argv.help) {
  console.log(`
    benchmark supports the following arguments:
      --headless    - render headless
      --gif         - create a gif in ./dist (requires ImageMagick 'convert' in path)
      --resultfile  - write stats to a timestamped file
      --throttle X  - wait X milliseconds between writes to the same file
      --help,-h     - print this message
`);
  process.exit(0);
  return;
}
const gif = argv.gif || false;
const headless = argv.headless || false;
const resultfile = argv.resultfile || false;
let throttle = argv.throttle || 0;

let vite;
let browser;
let page;
let hmrUpdateStats = [];
let bootStats = {
  vite: null,
  pageLoad: null,
};

const initialTriggerContent = `
<style>
    #svelte {color:inherit;}
    #vite {color:inherit;}
    #sweet {color:inherit;}
</style>
<span id="svelte"></span>
<span id="plus"></span>
<span id="vite"></span>
<span id="equals"></span>
<span id="sweet"></span>
`;
let currentTriggerContent = initialTriggerContent;

async function prepare() {
  await del(outputDir);
  await fs.mkdir(outputDir);
  await fs.writeFile(hmrTriggerFile, initialTriggerContent);
}

async function startVite() {
  const start = process.hrtime();
  const viteBin = path.join(__dirname, 'node_modules/.bin/vite');
  vite = execa(viteBin, { cwd: __dirname });
  return new Promise((resolve) => {
    vite.stdout.on('data', (data) => {
      if (data.toString().match('running')) {
        bootStats.vite = msDiff(start);
        resolve();
      }
    });
  });
}

async function openBrowser() {
  const start = process.hrtime();
  browser = await puppeteer.launch({ headless });
  page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  bootStats.pageLoad = msDiff(start);
}

async function typeIntoSpan(id, word) {
  const re = new RegExp(`<span id="${id}">[^<]*`);
  const letters = word.split('');
  for (let l of letters) {
    await updateTriggerFile((c) => c.replace(re, (x) => x + l));
  }
}
async function setColor(id, color) {
  const re = new RegExp(`#${id} {color:[^;]*;}`);
  await updateTriggerFile((c) => c.replace(re, `#${id} {color:${color};}`));
}

async function executeDemoScript() {
  await typeIntoSpan('svelte', 'svelte');
  await typeIntoSpan('plus', ' + ');
  await typeIntoSpan('vite', 'vite');
  await typeIntoSpan('equals', ' = ');
  await typeIntoSpan('sweet', 'sweet');
  await setColor('svelte', '#ff3e00');
  await setColor('vite', '#4fc08d');
  await setColor('sweet', '#ff3e00');
  for (let i = 0; i < 10; i++) {
    await setColor('sweet', '#4fc08d');
    await setColor('sweet', '#ff3e00');
  }
}

async function stopVite() {
  vite.kill('SIGTERM', {
    forceKillAfterTimeout: 2000,
  });
}

async function closeBrowser() {
  await browser.close();
}

async function run() {
  try {
    await prepare();
    await startVite();
    await openBrowser();
    await executeDemoScript();
    await closeBrowser();
    await stopVite();
    if (gif) {
      await produceGif();
    }
    await writeStats();
  } catch (e) {
    console.error('benchmark failed', e);
    process.exit(1);
  } finally {
    try {
      await closeBrowser();
    } catch (e) {
      console.error('failed to close browser', e);
    }
    try {
      await stopVite();
    } catch (e) {
      console.error('failed to stop vite', e);
    }
  }
}
run();

async function produceGif() {
  const convertArgs = [];
  for (let i = 0, ii = hmrUpdateStats.length; i < ii; i++) {
    const { duration, screenshot } = hmrUpdateStats[i];
    const filename = `${i}.png`;
    await fs.writeFile(`${outputDir}/${filename}`, screenshot);
    convertArgs.push('-delay', `${duration}x1000`, filename);
    delete hmrUpdateStats[i].screenshot;
  }
  convertArgs.push('-loop', '-1');
  convertArgs.push('benchmark.gif');
  try {
    await execa('convert', convertArgs, { cwd: outputDir });
    await del(`${outputDir}/*.png`);
  } catch (e) {
    console.error('converting png screenshots to gif failed, is ImageMagick "convert" available in path?', e);
  }
}

async function writeStats() {
  const durations = hmrUpdateStats.map((s) => s.duration);
  const updates = durations.length;
  const sum = durations.reduce((x, y) => x + y, 0);
  const avg = +(sum / updates).toFixed(2);
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const now = new Date();
  const { brand, cores } = await si.cpu();
  const { total, available, free } = await si.mem();
  const { platform } = await si.osInfo();
  const system = {
    platform,
    cpu: { brand, cores },
    mem: { total, available, free },
    date: now.toUTCString(),
  };
  const pkg = require(path.join(__dirname, 'package.json'));
  const lock = require(path.join(__dirname, 'package-lock.json'));
  const versions = {
    benchmark: pkg.version,
    svite: lock.dependencies.svite.version,
    vite: lock.dependencies.vite.version,
  };
  const settings = {
    headless,
    throttle,
    gif,
  };
  const result = {
    system,
    versions,
    stats: {
      boot: bootStats,
      updates: {
        count: updates,
        sum,
        avg,
        min,
        max,
        durations,
      },
    },
    settings,
  };

  if (resultfile) {
    const timestamp = now.toISOString().replace(/[\D]/g, '_').slice(0, -1);
    const outputFile = path.join(outputDir, `benchmark_${timestamp}.json`);
    await fs.writeFile(outputFile, JSON.stringify(result, null, 2));
    console.log(`saved result in ${outputFile}`);
  } else {
    result.stats.updates.durations = result.stats.updates.durations.join(',');
    console.log(result);
  }
}
async function updateTriggerFile(replacer) {
  currentTriggerContent = replacer(currentTriggerContent);
  let start = process.hrtime();
  try {
    await throttledWrite(hmrTriggerFile, currentTriggerContent, throttle);
    await hmrUpdateComplete(hmrTriggerFile, 250);
  } catch (e) {
    throttle += 10;
    console.log(
      `hmr update got stuck, increased write throttle to ${throttle}. use "--throttle ${throttle}" argument to prevent this message`,
    );
    start = process.hrtime();
    try {
      await throttledWrite(hmrTriggerFile, currentTriggerContent, throttle);
      await hmrUpdateComplete(hmrTriggerFile, 250);
    } catch (e) {
      console.log('retry also got stuck, giving up');
      throw e;
    }
  }
  let screenshot;
  if (headless) {
    // headless doesn't render, which kind of cheats the timing a bit. so render screenshot before taking the time
    screenshot = await takeScreenShot();
  }
  const stat = { duration: msDiff(start) };

  if (gif) {
    if (!screenshot) {
      screenshot = await takeScreenShot();
    }
    stat.screenshot = screenshot;
  }
  hmrUpdateStats.push(stat);
}

async function hmrUpdateComplete(file, timeout) {
  return new Promise(function (resolve, reject) {
    var timer;
    function listener(data) {
      const text = data.text();
      if (text.indexOf('updated') > -1) {
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

function msDiff(start) {
  const diff = process.hrtime(start);
  return diff[0] * 1000 + Math.round(diff[1] / 1e6);
}

async function takeScreenShot() {
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 180, height: 30 } });
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
