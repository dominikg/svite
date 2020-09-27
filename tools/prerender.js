/*
based loosely on https://developers.google.com/web/tools/puppeteer/articles/ssr
and svite's own test setup for serving build (taken from vite test setup)

// TODO more features. inline css and js options, blacklist requests to trackers etc
 */

const fs = require('fs-extra');
const log = require('./log');
const puppeteer = require('puppeteer-core');
const path = require('path');
const http = require('http');
const koa = require('koa');
const static = require('koa-static');
const send = require('koa-send');

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
  const args = ['--headless'];
  if (process.env.CI) {
    args.push('--disable-gpu', '--single-process', '--no-zygote', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage');
  }
  const executablePath = process.env.CHROME_BIN || (await guessChromePath());
  if (!executablePath) {
    throw new Error('failed to identify chrome executable path. set CHROME_BIN env variable');
  }
  return puppeteer.launch({
    headless: true,
    executablePath,
    args,
  });
};

const indexHtmlFallback = (dir) => {
  return async (ctx, next) => {
    await next();
    if (
      ctx.response.status === 404 &&
      ['GET', 'HEAD'].includes(ctx.request.method) &&
      ctx.request.header.accept.indexOf('text/html') > -1
    ) {
      await send(ctx, path.join(dir, 'index.html'));
    }
  };
};

const startServer = async (dir, port) => {
  // start a static file server
  try {
    const app = new koa();
    app.use(static(dir));
    app.use(indexHtmlFallback(dir));
    const server = http.createServer(app.callback());
    await new Promise((r) => server.listen(port, r));
    return server;
  } catch (e) {
    console.error(`failed to serve ${dir} on ${port}`, e);
    throw e;
  }
};

const prerenderUrl = async (url, browser) => {
  let page;
  try {
    page = await browser.newPage();

    await page.setRequestInterception(true);

    // other request types don't affect output html, so skip them
    const allowedRequestTypes = ['document', 'script', 'xhr', 'fetch', 'websocket'];

    page.on('request', (req) => {
      const type = req.resourceType();
      if (!allowedRequestTypes.includes(type)) {
        req.abort();
        return;
      }

      req.continue(); // pass through everything else.
    });

    const urlToFetch = new URL(url);

    await page.goto(urlToFetch.href, { waitUntil: 'networkidle0' });
    await page.waitForSelector('body');

    const html = await page.content();
    return html;
  } catch (e) {
    log.error(`prerender failed for ${url}`, e);
    throw e;
  } finally {
    try {
      if (page) {
        await page.close();
      }
    } catch (e) {
      log.debug(`failed to close page during prerender for ${url}`, e);
    }
  }
};

const writeHtml = async (route, html, distDir) => {
  const filename = routeToFilename(route, distDir);
  const parentDir = path.dirname(filename);
  await fs.mkdirp(parentDir);
  log.info(`writing ${filename}`);
  await fs.writeFile(filename, html);
};

const routeToFilename = (route, distDir) => {
  if (route.endsWith('/')) {
    return path.join(distDir, route, 'index.html');
  } else if (!route.endsWith('.html')) {
    return path.join(distDir, `${route}.html`);
  } else {
    return path.join(distDir, route);
  }
};

const prerender = async (options) => {
  let server;
  let browser;
  const outputDir = options.outDir || 'dist';
  const port = options.port || 4002;
  const routes = options.routes;

  try {
    server = await startServer(outputDir, port);
    browser = await launchPuppeteer(port);
    let prerenderPromises = [];
    for (const route of routes) {
      if (route === '/' || route === '/index' || route === '/index.html') {
        continue; //do not prerender base index.html until all routes have been prerendered
      }
      const url = `http://localhost:${port}${route}`;
      log.info('prerendering ' + url);
      const prerenderPromise = prerenderUrl(url, browser).then((html) => writeHtml(route, html, outputDir));
      prerenderPromises.push(prerenderPromise);
    }
    await Promise.allSettled(prerenderPromises);
    const indexContent = await fs.readFile(path.join(outputDir, 'index.html'));
    await fs.writeFile(path.join(outputDir, '__app.html'), indexContent);
    const route = '/';
    const url = `http://localhost:${port}${route}`;
    log.info('prerendering ' + url);
    await prerenderUrl(url, browser).then((html) => writeHtml(route, html, outputDir));
  } catch (e) {
    log.error(`prerender failed`, e);
  } finally {
    if (server) {
      try {
        server.close();
      } catch (e) {
        log.error('failed to stop server', e);
      }
    }
    if (browser) {
      try {
        browser.close();
      } catch (e) {
        log.error(`failed to close browser`, e);
      }
    }
  }
};

module.exports = {
  prerender,
};
