import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/serialization.ts", import.meta.url), "utf8")
  .replaceAll("export ", "")
  .replaceAll(": string", "")
  .replaceAll(": boolean", "")
  .replaceAll(": Document", "");

const module = {};
const testFunctions = new Function(`${source}; return { hasHtmlDoctype, filePathToBaseUrl };`)();

assert.equal(testFunctions.hasHtmlDoctype("<!doctype html><html></html>"), true);
assert.equal(testFunctions.hasHtmlDoctype("  <!DOCTYPE html>\n<html></html>"), true);
assert.equal(testFunctions.hasHtmlDoctype("<html></html>"), false);
assert.equal(
  testFunctions.filePathToBaseUrl("/Users/me/页面/index.html"),
  "file:///Users/me/%E9%A1%B5%E9%9D%A2/",
);
assert.equal(
  testFunctions.filePathToBaseUrl("C:\\Users\\me\\page.html"),
  "file:///C:/Users/me/",
);

void module;
console.log("core tests passed");
