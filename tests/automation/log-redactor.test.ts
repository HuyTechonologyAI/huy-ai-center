/**
 * TESTS: log-redactor
 * Phase: AI-DEV-BRIDGE-A
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  redact,
  redactObject,
  isSensitiveKey,
  safeJsonStringify,
} from "../../automation/agent-bridge/src/log-redactor.js";

describe("Log Redactor", () => {
  it("redacts SUPABASE_SERVICE_ROLE_KEY values", () => {
    const input = "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret";
    const output = redact(input);
    assert.ok(!output.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret"),
      "Service role key must be redacted");
  });

  it("redacts JWT tokens (Bearer)", () => {
    const input = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig";
    const output = redact(input);
    assert.ok(!output.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"),
      "JWT must be redacted");
  });

  it("redacts OpenAI API key pattern sk-", () => {
    const input = "Using key sk-abcdefghijklmnopqrstuvwxyz12345678901234";
    const output = redact(input);
    assert.ok(!output.includes("sk-abcdefghijklmnopqrstuvwxyz"),
      "OpenAI key must be redacted");
  });

  it("redacts GitHub PAT ghp_", () => {
    const input = "GITHUB_TOKEN=ghp_" + "A".repeat(36);
    const output = redact(input);
    assert.ok(!output.includes("ghp_" + "A".repeat(36)),
      "GitHub PAT must be redacted");
  });

  it("does NOT redact non-sensitive strings", () => {
    const input = "npm run test";
    const output = redact(input);
    assert.equal(output, input);
  });

  it("isSensitiveKey: *_KEY patterns", () => {
    assert.equal(isSensitiveKey("OPENAI_API_KEY"), true);
    assert.equal(isSensitiveKey("SERVICE_ROLE_KEY"), true);
    assert.equal(isSensitiveKey("MY_SECRET_KEY"), true);
  });

  it("isSensitiveKey: *_TOKEN patterns", () => {
    assert.equal(isSensitiveKey("GITHUB_TOKEN"), true);
    assert.equal(isSensitiveKey("ACCESS_TOKEN"), true);
  });

  it("isSensitiveKey: DATABASE_URL", () => {
    assert.equal(isSensitiveKey("DATABASE_URL"), true);
  });

  it("isSensitiveKey: non-sensitive keys return false", () => {
    assert.equal(isSensitiveKey("NODE_ENV"), false);
    assert.equal(isSensitiveKey("task_id"), false);
    assert.equal(isSensitiveKey("title"), false);
  });

  it("redactObject: scrubs sensitive keys", () => {
    const obj = {
      taskId: "bridge-001",
      OPENAI_API_KEY: "sk-secret-value",
      status: "PASS",
      SUPABASE_SERVICE_ROLE_KEY: "eyJfaketoken",
    };
    const redacted = redactObject(obj);
    assert.equal(redacted["taskId"], "bridge-001");
    assert.equal(redacted["status"], "PASS");
    assert.equal(redacted["OPENAI_API_KEY"], "[REDACTED]");
    assert.equal(redacted["SUPABASE_SERVICE_ROLE_KEY"], "[REDACTED]");
  });

  it("safeJsonStringify: redacts string values", () => {
    const data = {
      task: "build",
      key: "sk-" + "x".repeat(40),
    };
    const output = safeJsonStringify(data);
    assert.ok(!output.includes("sk-" + "x".repeat(40)),
      "safeJsonStringify must redact secrets in string values");
  });
});
