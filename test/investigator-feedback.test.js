import assert from "node:assert/strict";
import test from "node:test";
import { investigatorFailureMessage } from "../src/investigator-feedback.js";

test("turns a stopped local server into an actionable explanation error", () => {
  assert.equal(
    investigatorFailureMessage("Failed to fetch"),
    "BluePrinted’s server is unavailable. Restart it, then try again."
  );
});

test("preserves useful server errors and supplies a safe fallback", () => {
  assert.equal(investigatorFailureMessage("Request failed with status 500"), "Request failed with status 500");
  assert.equal(investigatorFailureMessage(), "The explanation request failed. Try again.");
});
