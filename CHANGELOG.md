# Changelog

### [8.0.3](https://www.github.com/gulpjs/glob-stream/compare/v8.0.2...v8.0.3) (2025-06-01)


### Bug Fixes

* Do not start and end the stream prematurely ([#136](https://www.github.com/gulpjs/glob-stream/issues/136)) ([9d36482](https://www.github.com/gulpjs/glob-stream/commit/9d364824a925cf10b30ea3cb4f91f7c0cf44784f))

### [8.0.2](https://www.github.com/gulpjs/glob-stream/compare/v8.0.1...v8.0.2) (2024-04-08)


### Bug Fixes

* Avoid blowing the call stack when processing many files ([#133](https://www.github.com/gulpjs/glob-stream/issues/133)) ([bb21c9d](https://www.github.com/gulpjs/glob-stream/commit/bb21c9dc14b52ff275e5c4ab3e2c3c7de9dd63f8))
* Avoid following circular symlinks ([#126](https://www.github.com/gulpjs/glob-stream/issues/126)) ([cf8b197](https://www.github.com/gulpjs/glob-stream/commit/cf8b1971a239e165a61654dffeac546faae449fc))
* Only traverse directories that can match the glob base ([#131](https://www.github.com/gulpjs/glob-stream/issues/131)) ([8e74e21](https://www.github.com/gulpjs/glob-stream/commit/8e74e21840fd38cef4cbce050c99690349b4ee92))

### [8.0.1](https://www.github.com/gulpjs/glob-stream/compare/v8.0.0...v8.0.1) (2024-03-25)


### Bug Fixes

* Avoid pushing additional paths to queue when error occurs ([#124](https://www.github.com/gulpjs/glob-stream/issues/124)) ([8eaab85](https://www.github.com/gulpjs/glob-stream/commit/8eaab85cbc7254d2e74d308c822df50a9e7aaf4a))
* Traverse symlink folders ([#122](https://www.github.com/gulpjs/glob-stream/issues/122)) ([d49d9bd](https://www.github.com/gulpjs/glob-stream/commit/d49d9bd8042650ce91c190ab0ec20be716b2fade))

## [8.0.0](https://www.github.com/gulpjs/glob-stream/compare/v7.0.0...v8.0.0) (2023-04-23)


### ⚠ BREAKING CHANGES

* Switch to streamx (#119)
* Combine GlobStream & GlobReadable into unified API
* Replace glob with anymatch & custom directory walk (#118)
* Drop support for ordered globs (#115)

### Features

* Combine GlobStream & GlobReadable into unified API ([6aad264](https://www.github.com/gulpjs/glob-stream/commit/6aad264004e4f1a7f1b6e112c5d7e0fc7db72851))
* Replace glob with anymatch & custom directory walk ([#118](https://www.github.com/gulpjs/glob-stream/issues/118)) ([6aad264](https://www.github.com/gulpjs/glob-stream/commit/6aad264004e4f1a7f1b6e112c5d7e0fc7db72851))
* Switch to streamx ([#119](https://www.github.com/gulpjs/glob-stream/issues/119)) ([8d6b35c](https://www.github.com/gulpjs/glob-stream/commit/8d6b35c1f0c89b7869d2ed7ab9e5ec79694e28e2))


### Bug Fixes

* Normalize cwd on windows ([8d6b35c](https://www.github.com/gulpjs/glob-stream/commit/8d6b35c1f0c89b7869d2ed7ab9e5ec79694e28e2))
* Properly handle glob-like characters in paths ([#117](https://www.github.com/gulpjs/glob-stream/issues/117)) ([872a957](https://www.github.com/gulpjs/glob-stream/commit/872a957c59cc4d1a1bc674b0370c97809d7c595c))
* Resolve cwd to support relative cwd paths ([8d6b35c](https://www.github.com/gulpjs/glob-stream/commit/8d6b35c1f0c89b7869d2ed7ab9e5ec79694e28e2))


### Miscellaneous Chores

* Drop support for ordered globs ([#115](https://www.github.com/gulpjs/glob-stream/issues/115)) ([f37bccc](https://www.github.com/gulpjs/glob-stream/commit/f37bccc91cd7ffe5bd61010e10b3a850c134677a))

## [7.0.0](https://www.github.com/gulpjs/glob-stream/compare/v6.1.0...v7.0.0) (2021-10-31)


### ⚠ BREAKING CHANGES

* Normalize repository, dropping node <10.13 support (#101)

### Miscellaneous Chores

* Normalize repository, dropping node <10.13 support ([#101](https://www.github.com/gulpjs/glob-stream/issues/101)) ([c110ed1](https://www.github.com/gulpjs/glob-stream/commit/c110ed1602b9bbcb380c97298e9ba41a29a0be40))
