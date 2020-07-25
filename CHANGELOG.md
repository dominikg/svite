
### [0.3.3-beta.0](https://github.com/dominikg/svite/compare/0.3.2...0.3.3-beta.0) (2020-07-25)


### Features

* support typescript ([4effaec](https://github.com/dominikg/svite/commit/4effaec00d7b56bb1695cf103640e0d719a6cc5c))

### [0.3.2](https://github.com/dominikg/svite/compare/0.3.1...0.3.2) (2020-07-23)


### Bug Fixes

* pin vite to 1.0.0-beta.12 to avoid buggy behavior described in [#17](https://github.com/dominikg/svite/issues/17) ([681722b](https://github.com/dominikg/svite/commit/681722b6e7e907171b9414389f0f532aacabb999))

### [0.3.1](https://github.com/dominikg/svite/compare/0.3.0...0.3.1) (2020-07-22)


### Bug Fixes

* log helpful output on dev transform error (fix [#15](https://github.com/dominikg/svite/issues/15)) ([99d66d3](https://github.com/dominikg/svite/commit/99d66d33f68a190ec5e41cb818066eea2bf9c9bf))

## [0.3.0](https://github.com/dominikg/svite/compare/0.2.4...0.3.0) (2020-07-21)


### ⚠ BREAKING CHANGES

* if you use svelte and vue together, you can no longer use the svite binary.

You can however add svite as plugin in vite.config.js and use vite cli.

### Features

* update to vite-1.0.0-rc.3 and disable vue plugin in svite cli ([2338671](https://github.com/dominikg/svite/commit/2338671c559b1b31d9b600b045d9e297904a88a9))


### Bug Fixes

* don't override vite.config.js values with cli defaults (fix [#13](https://github.com/dominikg/svite/issues/13)) ([601ecae](https://github.com/dominikg/svite/commit/601ecae49a35dc812880fac5bcba3e3b0ab1cf66))

### [0.2.4](https://github.com/dominikg/svite/compare/0.2.3...0.2.4) (2020-07-20)


### Bug Fixes

* invalid formatting in nested stylus and pug ([16c25ec](https://github.com/dominikg/svite/commit/16c25ec81b9f523edd567054cc012e84d8f89d34))
* make sure deferred rollup plugins have a name right away (fix [#12](https://github.com/dominikg/svite/issues/12)) ([6c3eb16](https://github.com/dominikg/svite/commit/6c3eb16b5e7a326e0794ca90eb827e055a0da5b5))

### [0.2.3](https://github.com/dominikg/svite/compare/0.2.2...0.2.3) (2020-07-14)


### Bug Fixes

* don't remove rollup plugins provided in vite.config.js ([4dd91ec](https://github.com/dominikg/svite/commit/4dd91ec8adcfc54b7de408d096fc1a7daa4dcd7e))

### [0.2.2](https://github.com/dominikg/svite/compare/0.2.2-beta.6...0.2.2) (2020-07-14)

### [0.2.2-beta.6](https://github.com/dominikg/svite/compare/0.2.2-beta.5...0.2.2-beta.6) (2020-07-14)


### Features

* **cli:** add --stat option to build ([8d908cf](https://github.com/dominikg/svite/commit/8d908cf0d3d1cadf34ba8c5b6a13c592baf44e1d))

### [0.2.2-beta.5](https://github.com/dominikg/svite/compare/0.2.2-beta.4...0.2.2-beta.5) (2020-07-13)


### Bug Fixes

* **cli:** use vite defaults for build --ssr {outputDir: 'dist-ssr', assetsDir: '.'} ([5928c49](https://github.com/dominikg/svite/commit/5928c4937eecdd321b03ba872b6219d62e6d97c0))

### [0.2.2-beta.4](https://github.com/dominikg/svite/compare/0.2.2-beta.3...0.2.2-beta.4) (2020-07-12)


### Features

* **cli:** add optimize command ([f18e12a](https://github.com/dominikg/svite/commit/f18e12a0aa11546bc9e5d997b8457cf7a840bac1))

### [0.2.2-beta.3](https://github.com/dominikg/svite/compare/v0.2.2-beta.1...v0.2.2-beta.3) (2020-07-12)


### Bug Fixes

* execa dependency ([d4bcb0f](https://github.com/dominikg/svite/commit/d4bcb0fa52aac21f03c28dce42c476859f33233f))

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
