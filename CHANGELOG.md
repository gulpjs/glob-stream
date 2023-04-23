# Changelog

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
