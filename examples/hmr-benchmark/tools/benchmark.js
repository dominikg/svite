/* eslint-env node */
const fs = require('fs-extra');
const path = require('path');
const execa = require('execa');
const puppeteer = require('puppeteer');
const del = require('del');
const outputDir = path.join(__dirname, 'dist');
const hmrTriggerFile = path.join(__dirname, 'src/App.svelte');
const headless = false;

let vite;
let browser;
let page;
let createGif = true;
let hmrUpdateStats = [];
let bootStats = {
  vite: null,
  pageLoad: null,
};

const initialTriggerContent = `
<script>
    const x=''
</script>
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
  await fs.mkdirp(outputDir);
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
  await prepare();
  await startVite();
  await openBrowser();
  await executeDemoScript();
  await closeBrowser();
  await stopVite();
  if (createGif) {
    await produceGif();
  }
  await writeStats();
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
  await execa('convert', convertArgs, { cwd: outputDir });
  await del(`${outputDir}/*.png`);
}

async function writeStats() {
  const durations = hmrUpdateStats.map((s) => s.duration);
  const updates = durations.length;
  const sum = durations.reduce((x, y) => x + y, 0);
  const avg = +(sum / updates).toFixed(2);
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const result = {
    bootStats,
    updateStats: {
      sum,
      avg,
      min,
      max,
    },
    updates,
  };
  console.log(result);
  result.durations = durations;
  await fs.writeFile(path.join(outputDir, 'benchmark.json'), JSON.stringify(result, null, 2));
}
async function updateTriggerFile(replacer) {
  currentTriggerContent = replacer(currentTriggerContent);
  const start = process.hrtime();
  await fs.writeFile(hmrTriggerFile, currentTriggerContent);
  await hmrUpdateComplete();
  const stat = { duration: msDiff(start) };
  if (createGif) {
    stat.screenshot = await takeScreenShot();
  }
  hmrUpdateStats.push(stat);
}

async function hmrUpdateComplete() {
  return new Promise((r) => page.once('console', r));
}

function msDiff(start) {
  const diff = process.hrtime(start);
  return diff[0] * 1000 + Math.round(diff[1] / 1e6);
}

async function takeScreenShot() {
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 180, height: 30 } });
}
