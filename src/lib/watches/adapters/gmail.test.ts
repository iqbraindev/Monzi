import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adaptGmailCandidates } from "@/lib/watches/adapters/gmail";
import { adaptGenericCandidates } from "@/lib/watches/adapters/generic";
import { normalizeWatchResult } from "@/lib/watches/adapters";

describe("adaptGmailCandidates", () => {
  it("normalizes gmail messages into watch candidates", () => {
    const raw = {
      messages: [
        {
          id: "msg-1",
          from: "Lead X <lead@acme.com>",
          subject: "Pricing question",
          snippet: "Interested in your SaaS product",
          internalDate: "1719000000000",
        },
      ],
    };

    const candidates = adaptGmailCandidates(raw);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]?.id, "msg-1");
    assert.equal(candidates[0]?.title, "Pricing question");
    assert.match(candidates[0]?.text ?? "", /Pricing question/);
    assert.ok(candidates[0]?.timestamp);
  });
});

describe("adaptGenericCandidates", () => {
  it("extracts id and text from generic list payloads", () => {
    const raw = {
      items: [
        {
          id: "deal-42",
          title: "Acme Corp",
          description: "Moved to negotiation",
          updated_at: "2024-06-01T12:00:00.000Z",
        },
      ],
    };

    const candidates = adaptGenericCandidates(raw);
    assert.equal(candidates[0]?.id, "deal-42");
    assert.equal(candidates[0]?.title, "Acme Corp");
  });
});

describe("normalizeWatchResult", () => {
  it("routes gmail toolkit to gmail adapter", () => {
    const raw = { messages: [{ id: "a", subject: "Hi", from: "a@b.com" }] };
    const candidates = normalizeWatchResult("gmail", raw);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]?.id, "a");
  });
});
