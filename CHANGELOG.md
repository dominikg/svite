
### [0.7.1-beta.0](https://github.com/dominikg/svite/compare/0.7.0...0.7.1-beta.0) (2020-09-20)


### Bug Fixes

* absolute import resolver incorrectly declined all ids as existing modules (fixes [#56](https://github.com/dominikg/svite/issues/56)) ([85168cb](https://github.com/dominikg/svite/commit/85168cb366cb782eeb6234cec42651142ce59a05))

## [0.7.0](https://github.com/dominikg/svite/compare/0.7.0-beta.1...0.7.0) (2020-09-17)

## [0.7.0-beta.1](https://github.com/dominikg/svite/compare/0.7.0-beta.0...0.7.0-beta.1) (2020-09-16)


### Features

* update svelte to 3.25.1 ([7e1bb60](https://github.com/dominikg/svite/commit/7e1bb60ce68ec91ee5e69793048b98f07ca2b803))

## [0.7.0-beta.0](https://github.com/dominikg/svite/compare/0.6.1...0.7.0-beta.0) (2020-09-14)


### ⚠ BREAKING CHANGES

* move svelte and svelte-hmr to devDependencies

### Features

* more checks to not alias existing modules, convert alias to use forward slashes ([a452f94](https://github.com/dominikg/svite/commit/a452f948c1e294a6729598f0eef21a6215611e65))
* move svelte and svelte-hmr to devDependencies ([42a692b](https://github.com/dominikg/svite/commit/42a692bbff887741353bd1f315cd6a711c9fc1bc))
* update svelte to 3.25.0 ([38af713](https://github.com/dominikg/svite/commit/38af7139d6a9cc801ee82d40162ecb0ccf79c8ca))


### Bug Fixes

* do not create aliases for absolute paths into node_modules ([5310ef6](https://github.com/dominikg/svite/commit/5310ef6f2daa912a09c0ec4bf80531468fcb139a))

### [0.6.1](https://github.com/dominikg/svite/compare/0.6.1-beta.2...0.6.1) (2020-09-08)

### [0.6.1-beta.2](https://github.com/dominikg/svite/compare/0.6.1-beta.1...0.6.1-beta.2) (2020-09-08)


### Bug Fixes

* convert cli option values to their default type (fixes [#45](https://github.com/dominikg/svite/issues/45)) ([0b08deb](https://github.com/dominikg/svite/commit/0b08deb85027006d23192fa206c745c57017bd92))
* turn off resolveSvelteExtensions by default. (fixes [#44](https://github.com/dominikg/svite/issues/44)) ([2adb55a](https://github.com/dominikg/svite/commit/2adb55a9f4be1860c8ea0b390cccbfc0d12c0021))

### [0.6.1-beta.1](https://github.com/dominikg/svite/compare/0.6.1-beta.0...0.6.1-beta.1) (2020-09-06)


### Features

* add --mode option to svite dev command ([d515a55](https://github.com/dominikg/svite/commit/d515a553b114dd32e6dc201dd743dbea2dc61635))

### [0.6.1-beta.0](https://github.com/dominikg/svite/compare/0.6.0...0.6.1-beta.0) (2020-09-01)


### Features

* options for root directory and resolving of absolute imports inside root ([b9192a0](https://github.com/dominikg/svite/commit/b9192a0b3e9f585d54b2808ddc1bbc9bc02a270a))
* update routify-mdsvex example with an mdsvex layout ([d413141](https://github.com/dominikg/svite/commit/d413141523ca458c7ee9f6a3aae9e31fb8b32a68))

## [0.6.0](https://github.com/dominikg/svite/compare/0.6.0-beta.1...0.6.0) (2020-08-30)

## [0.6.0-beta.1](https://github.com/dominikg/svite/compare/0.6.0-beta.0...0.6.0-beta.1) (2020-08-23)


### Features

* remove additional rollup-plugin-node-resolve and configure rollupDedupe via cli ([97f9f01](https://github.com/dominikg/svite/commit/97f9f01f9a91a4c94dc5d864bcbef5b99e8b32a9))

## [0.6.0-beta.0](https://github.com/dominikg/svite/compare/0.5.1-beta.1...0.6.0-beta.0) (2020-08-23)

### ⚠ BREAKING CHANGES

- svite now declares supported engines in package.json if you are using older versions it's time to update

```js
  "engines": {
    "node": "^12||^14",
    "npm": "^6.14",
    "yarn": "^1.22 || ^2",
    "pnpm": "^5.5"
  }
```

### Features

- add tests for other package managers: install,dev,build with yarn,yarn2,pnpm ([06334f3](https://github.com/dominikg/svite/commit/06334f3e1a6455faa12500ac7eee214dec0fdad1))
- declare supported engines: node 12,14 with modern package managers ([153f28d](https://github.com/dominikg/svite/commit/153f28dd6e0579c1d60af7963cdbe8e6c3b43ea0))

### [0.5.1-beta.1](https://github.com/dominikg/svite/compare/0.5.1-beta.0...0.5.1-beta.1) (2020-08-17)

### Features

- add packageManager option to create command ([c9f44b5](https://github.com/dominikg/svite/commit/c9f44b59f3ccc287c8dedc0bcf71309593ebf30b))

### [0.5.1-beta.0](https://github.com/dominikg/svite/compare/0.5.0...0.5.1-beta.0) (2020-08-16)

### Features

- improve resolving ([7677bdf](https://github.com/dominikg/svite/commit/7677bdf9fc333756090f85aae0a637dfcdd99984))

### Bug Fixes

- always pass mode option to vite and make sure process.env.NODE_ENV is set ([151bbf5](https://github.com/dominikg/svite/commit/151bbf5070bdb6fa672d4021be15b9225af33329))

## [0.5.0](https://github.com/dominikg/svite/compare/0.5.0-beta.1...0.5.0) (2020-08-13)

## [0.5.0-beta.1](https://github.com/dominikg/svite/compare/0.5.0-beta.0...0.5.0-beta.1) (2020-08-13)

### ⚠ BREAKING CHANGES

- new major version of rollup-pluginutils changes filter behavior

### Bug Fixes

- update depdendencies, svelte-preprocess as optional dependency ([4853116](https://github.com/dominikg/svite/commit/4853116c5625102a9e920c8d2cec3ac47f77c394))

## [0.5.0-beta.0](https://github.com/dominikg/svite/compare/0.4.1...0.5.0-beta.0) (2020-08-10)

### ⚠ BREAKING CHANGES

- vite moved from peer dependency to dependency
- dependencies that caused issues after updating them have been set to exact version
- svelte-hmr is a peer-dependency. add as dependency to project

### Features

- add option to resolve via svelte field during dev ([06505ba](https://github.com/dominikg/svite/commit/06505bae0446989c486810fa01253ba0017816f6))
- change dependency setup ([2c5d6ad](https://github.com/dominikg/svite/commit/2c5d6ad32843c4b5f7a36145ec6b272f635bafce))

### Bug Fixes

- navigation links in routify examples work in dev ([ef9cda6](https://github.com/dominikg/svite/commit/ef9cda621860d8fa787946ab11d77190ad48c5b4))

### [0.4.1](https://github.com/dominikg/svite/compare/0.4.0...0.4.1) (2020-08-02)

### Bug Fixes

- **hmr:** disable template cache by default and expose svite dev options on cli (fix [#17](https://github.com/dominikg/svite/issues/17))(fix [#33](https://github.com/dominikg/svite/issues/33)) ([61a93f1](https://github.com/dominikg/svite/commit/61a93f19d38576ab1e194c888402c06565226e91))

## [0.4.0](https://github.com/dominikg/svite/compare/0.4.0-beta.0...0.4.0) (2020-08-01)

### Features

- **typescript:** update benchmark to use svite binary, add typescript option ([a25dc2e](https://github.com/dominikg/svite/commit/a25dc2ecc1a4a71ee387ce916b6241dd2887c02f))

## [0.4.0-beta.0](https://github.com/dominikg/svite/compare/0.3.3-beta.2...0.4.0-beta.0) (2020-07-31)

### ⚠ BREAKING CHANGES

- svite dev -sw,--serviceworker option removed

### Features

- update to vite-1.0.0-rc.4 ([b24cebd](https://github.com/dominikg/svite/commit/b24cebd71c9697e4aff80ae237a9d330aef5950e))
- **typescript:** rewrite typescript support use first preprocessor convention ([fe2b583](https://github.com/dominikg/svite/commit/fe2b583149325c8651038dc54ec9655e610be54c))
- enable use of import.meta.hot in typescript ([15a4b5e](https://github.com/dominikg/svite/commit/15a4b5e13dcd8bb2f87e9325bc92fe7d891432ca))

### Bug Fixes

- **create:** remove quotes from initial commit message ([083fffd](https://github.com/dominikg/svite/commit/083fffdfd11cfeb519831e4dd580f7a2adc36e85))

### [0.3.3-beta.2](https://github.com/dominikg/svite/compare/0.3.3-beta.1...0.3.3-beta.2) (2020-07-26)

### Bug Fixes

- create -ts option ate targetDir arg, remove value from option ([9d8385b](https://github.com/dominikg/svite/commit/9d8385bfcc7d5c1b191b2f4cf2ed8365569aa519))

### [0.3.3-beta.1](https://github.com/dominikg/svite/compare/0.3.3-beta.0...0.3.3-beta.1) (2020-07-26)

### Features

- add typescript option for all examples available as create template ([10cf32c](https://github.com/dominikg/svite/commit/10cf32c22c92c2e1d980cbfd2ac1aa944c5202ea))
- **create:** add vscode svelte plugin recommendation ([2211d85](https://github.com/dominikg/svite/commit/2211d856dbfea4c8c25010d8a0a86ea2af98b25a))
- improve .gitignore in examples ([87b5fee](https://github.com/dominikg/svite/commit/87b5feef71b8ca7e6c0dc7cc8802619859d262ec))

### [0.3.3-beta.0](https://github.com/dominikg/svite/compare/0.3.2...0.3.3-beta.0) (2020-07-25)

### Features

- support typescript ([4effaec](https://github.com/dominikg/svite/commit/4effaec00d7b56bb1695cf103640e0d719a6cc5c))

### [0.3.2](https://github.com/dominikg/svite/compare/0.3.1...0.3.2) (2020-07-23)

### Bug Fixes

- pin vite to 1.0.0-beta.12 to avoid buggy behavior described in [#17](https://github.com/dominikg/svite/issues/17) ([681722b](https://github.com/dominikg/svite/commit/681722b6e7e907171b9414389f0f532aacabb999))

### [0.3.1](https://github.com/dominikg/svite/compare/0.3.0...0.3.1) (2020-07-22)

### Bug Fixes

- log helpful output on dev transform error (fix [#15](https://github.com/dominikg/svite/issues/15)) ([99d66d3](https://github.com/dominikg/svite/commit/99d66d33f68a190ec5e41cb818066eea2bf9c9bf))

## [0.3.0](https://github.com/dominikg/svite/compare/0.2.4...0.3.0) (2020-07-21)

### ⚠ BREAKING CHANGES

- if you use svelte and vue together, you can no longer use the svite binary.

You can however add svite as plugin in vite.config.js and use vite cli.

### Features

- update to vite-1.0.0-rc.3 and disable vue plugin in svite cli ([2338671](https://github.com/dominikg/svite/commit/2338671c559b1b31d9b600b045d9e297904a88a9))

### Bug Fixes

- don't override vite.config.js values with cli defaults (fix [#13](https://github.com/dominikg/svite/issues/13)) ([601ecae](https://github.com/dominikg/svite/commit/601ecae49a35dc812880fac5bcba3e3b0ab1cf66))

### [0.2.4](https://github.com/dominikg/svite/compare/0.2.3...0.2.4) (2020-07-20)

### Bug Fixes

- invalid formatting in nested stylus and pug ([16c25ec](https://github.com/dominikg/svite/commit/16c25ec81b9f523edd567054cc012e84d8f89d34))
- make sure deferred rollup plugins have a name right away (fix [#12](https://github.com/dominikg/svite/issues/12)) ([6c3eb16](https://github.com/dominikg/svite/commit/6c3eb16b5e7a326e0794ca90eb827e055a0da5b5))

### [0.2.3](https://github.com/dominikg/svite/compare/0.2.2...0.2.3) (2020-07-14)

### Bug Fixes

- don't remove rollup plugins provided in vite.config.js ([4dd91ec](https://github.com/dominikg/svite/commit/4dd91ec8adcfc54b7de408d096fc1a7daa4dcd7e))

### [0.2.2](https://github.com/dominikg/svite/compare/0.2.2-beta.6...0.2.2) (2020-07-14)

### [0.2.2-beta.6](https://github.com/dominikg/svite/compare/0.2.2-beta.5...0.2.2-beta.6) (2020-07-14)

### Features

- **cli:** add --stat option to build ([8d908cf](https://github.com/dominikg/svite/commit/8d908cf0d3d1cadf34ba8c5b6a13c592baf44e1d))

### [0.2.2-beta.5](https://github.com/dominikg/svite/compare/0.2.2-beta.4...0.2.2-beta.5) (2020-07-13)

### Bug Fixes

- **cli:** use vite defaults for build --ssr {outputDir: 'dist-ssr', assetsDir: '.'} ([5928c49](https://github.com/dominikg/svite/commit/5928c4937eecdd321b03ba872b6219d62e6d97c0))

### [0.2.2-beta.4](https://github.com/dominikg/svite/compare/0.2.2-beta.3...0.2.2-beta.4) (2020-07-12)

### Features

- **cli:** add optimize command ([f18e12a](https://github.com/dominikg/svite/commit/f18e12a0aa11546bc9e5d997b8457cf7a840bac1))

### [0.2.2-beta.3](https://github.com/dominikg/svite/compare/v0.2.2-beta.1...v0.2.2-beta.3) (2020-07-12)

### Bug Fixes

- execa dependency ([d4bcb0f](https://github.com/dominikg/svite/commit/d4bcb0fa52aac21f03c28dce42c476859f33233f))

### [0.2.2-beta.2](https://github.com/dominikg/svite/compare/v0.2.2-beta.1...v0.2.2-beta.2) (2020-07-12)

### Bug Fixes

- execa dependency ([d4bcb0f](https://github.com/dominikg/svite/commit/d4bcb0fa52aac21f03c28dce42c476859f33233f))

### [0.2.2-beta.1](https://github.com/dominikg/svite/compare/v0.2.2-beta.0...v0.2.2-beta.1) (2020-07-12)

### Features

- **cli:** add create command ([d10292b](https://github.com/dominikg/svite/commit/d10292ba7c4e9481e32ca0a410bdca230958ce43))

### [0.2.2-beta.0](https://github.com/dominikg/svite/compare/v0.2.1...v0.2.2-beta.0) (2020-07-11)

### Features

- use same debug output method as vite and allow configuration through --debug cli option ([37e63b9](https://github.com/dominikg/svite/commit/37e63b9f371e7ec2b7c3ce9d798cb38664795569))
- **cli:** graceful exit on SIGTERM and SIGINT ([519c759](https://github.com/dominikg/svite/commit/519c75988ef6a8a31ecb310d0b237c279f729ec3))
- add svite binary ([d3ddee0](https://github.com/dominikg/svite/commit/d3ddee0728b124dea4f6bdfada27f0dfb0dab366))
- use svite bin in minimal example ([e35bc93](https://github.com/dominikg/svite/commit/e35bc93ca9c6d40c2df77f305852d72de67a86be))

### Bug Fixes

- async handling for commands in bin ([2e1e698](https://github.com/dominikg/svite/commit/2e1e6984d050887694632af13be1036cc2a18c6f))

### 0.2.1 (2020-07-06)

### Features

- use standard-version to manage releases ([21fa0a5](https://github.com/dominikg/svite/commit/21fa0a5c8c767593ea64617a937690cce6619a12))

## 0.2.0

### BREAKING

- removed cosmiconfig support for svelte config
  - `svelte.config.js` is now the only file where you may specify svelte options (besides plugin initialization)

### Added

- support proposed `compilerOptions` in `svelte.config.js`
- testsuite that ensures examples are working

### Changed

- bumped vite to 1.0.0-beta.10

## 0.1.0

### BREAKING

- update to rollup-plugin-svelte-hot/svelte-hmr 0.10.0
  - hmr updates behave differently (less buggy) with noPreserveState=true

### Added

- new hmr-showcase example with guided demonstration
- hmr-benchmark with cool gif output

### Other improvements

- cut down test execution time

## 0.0.10

### BREAKING

- default to `noPreserveState: true` in svelte-hmr options. Custom stores can be used for preservable state

### Added

- Initial work on testsuite based on vite's test.js
- prevent purging when using dynamic class bindings like `class:p-4={true}` in tailwind example

### 0.0.9

### Added

- upated changelog

### 0.0.8

### Changed

- fixed default svelte extensions list

## 0.0.7

### Added

- deferred initialization of rollup plugin
- improved log output

## 0.0.6

### Added

- tiny logo
- correct evaluation of vite mode for build

## 0.0.5

### Added

- logLevel option
- debug log output
- useTransformCache option

### Changed

- reenabled overriding svelte config for dev and build

### Removed

- workaround for emitCss

## 0.0.4

### Added

- updated dependencies of examples

### Fixed

- optimizeDeps were not built correctly in 0.0.3

## 0.0.3

### Added

- logging util with colors and more helpful output

### Changed

- use vite transform instead of middleware in dev mode
- workaround for emitCss

## 0.0.2

### Added

- force removal of .html extension from svelte config
- linting for svite and examples

## 0.0.1 Initial Release

### Added

- initial support for `vite` and `vite build` commands
- read svelte configruation with cosmiconfig
- svelte preprocessor support
- hot module reloading thanks to svelte-hmr
- drop-in installation as vite plugin
