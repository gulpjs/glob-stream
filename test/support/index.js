"use strict";

const assert = require("node:assert");
var { isDeepStrictEqual } = require("node:util");

exports.assertExtras = {
  containsAllEqual(pathObjs, expected) {
    assert.strictEqual(pathObjs.length, expected.length);

    expected.forEach(function (item) {
      assert.strictEqual(
        pathObjs.some(function (pathObj) {
          return isDeepStrictEqual(pathObj, item);
        }),
        true,
      );
    });
  },
};
