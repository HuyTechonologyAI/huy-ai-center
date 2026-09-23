/**
 * TESTS: command-guard
 * Phase: AI-DEV-BRIDGE-A
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkCommandSync } from "../../automation/agent-bridge/src/command-guard.js";

describe("Command Guard", () => {
  it("ALLOW: npm run test", () => {
    assert.equal(checkCommandSync("npm run test"), "ALLOW");
  });

  it("ALLOW: npm run typecheck", () => {
    assert.equal(checkCommandSync("npm run typecheck"), "ALLOW");
  });

  it("ALLOW: git diff --stat HEAD", () => {
    assert.equal(checkCommandSync("git diff --stat HEAD"), "ALLOW");
  });

  it("ALLOW: git commit on feature branch", () => {
    assert.equal(
      checkCommandSync("git commit -m 'fix: test'", "feature/my-task"),
      "ALLOW"
    );
  });

  it("HUMAN_REQUIRED: git push origin main", () => {
    assert.equal(
      checkCommandSync("git push origin main"),
      "HUMAN_REQUIRED"
    );
  });

  it("HUMAN_REQUIRED: git push --force", () => {
    assert.equal(
      checkCommandSync("git push --force origin feature/x"),
      "HUMAN_REQUIRED"
    );
  });

  it("HUMAN_REQUIRED: git push -f", () => {
    assert.equal(checkCommandSync("git push -f"), "HUMAN_REQUIRED");
  });

  it("HUMAN_REQUIRED: main branch target", () => {
    assert.equal(
      checkCommandSync("git push", "main"),
      "HUMAN_REQUIRED"
    );
  });

  it("HUMAN_REQUIRED: vercel --prod", () => {
    assert.equal(
      checkCommandSync("vercel --prod"),
      "HUMAN_REQUIRED"
    );
  });

  it("HUMAN_REQUIRED: supabase db push", () => {
    assert.equal(
      checkCommandSync("supabase db push"),
      "HUMAN_REQUIRED"
    );
  });

  it("HUMAN_REQUIRED: DROP TABLE", () => {
    assert.equal(
      checkCommandSync("DROP TABLE public.agents"),
      "HUMAN_REQUIRED"
    );
  });

  it("HUMAN_REQUIRED: TRUNCATE", () => {
    assert.equal(
      checkCommandSync("TRUNCATE TABLE ai_tasks"),
      "HUMAN_REQUIRED"
    );
  });

  it("HUMAN_REQUIRED: gh pr merge", () => {
    assert.equal(checkCommandSync("gh pr merge 5"), "HUMAN_REQUIRED");
  });

  it("PR creation is ALLOW (R2 automatic)", () => {
    // gh pr create is R2 = AUTO
    assert.equal(checkCommandSync("gh pr create --title 'feat'"), "ALLOW");
  });
});
