import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPlanFromToolkit,
  inferToolkitFromDescription,
} from "@/lib/watches/toolkit-defaults";

describe("inferToolkitFromDescription", () => {
  it("detects email/lead watches as gmail", () => {
    assert.equal(
      inferToolkitFromDescription("Watch if a lead emails about Smiyli"),
      "gmail"
    );
  });
});

describe("buildPlanFromToolkit", () => {
  it("builds gmail plan with GMAIL_FETCH_EMAILS", () => {
    const plan = buildPlanFromToolkit(
      "Watch if a lead emails about Smiyli",
      "gmail"
    );
    assert.ok(plan);
    assert.equal(plan!.toolkit, "gmail");
    assert.equal(plan!.poll_tool, "GMAIL_FETCH_EMAILS");
  });
});
