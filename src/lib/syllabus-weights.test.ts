import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyWeightWithLastFlex,
  isSiblingGroupValid,
  normalizeSiblingWeights,
  prorateAfterDelete,
  siblingSum,
} from "./syllabus-weights";

describe("applyWeightWithLastFlex", () => {
  it("sets last sibling to remainder", () => {
    const siblings = [
      { id: "a", weightPercent: 25 },
      { id: "b", weightPercent: 35 },
      { id: "c", weightPercent: 40 },
    ];
    const out = applyWeightWithLastFlex(siblings, "a", 30);
    assert.equal(out[0].weightPercent, 30);
    assert.equal(out[1].weightPercent, 35);
    assert.equal(out[2].weightPercent, 35);
    assert.ok(isSiblingGroupValid(siblingSum(out)));
  });
});

describe("normalizeSiblingWeights", () => {
  it("fixes two children at 100% each", () => {
    const out = normalizeSiblingWeights([
      { id: "a", weightPercent: 100 },
      { id: "b", weightPercent: 100 },
    ]);
    assert.ok(isSiblingGroupValid(siblingSum(out)));
    assert.equal(out[0].weightPercent, 50);
    assert.equal(out[1].weightPercent, 50);
  });
});

describe("prorateAfterDelete", () => {
  it("distributes deleted weight proportionally", () => {
    const siblings = [
      { id: "a", weightPercent: 50 },
      { id: "b", weightPercent: 25 },
      { id: "c", weightPercent: 15 },
      { id: "d", weightPercent: 10 },
    ];
    const { survivors } = prorateAfterDelete(siblings, "b");
    assert.equal(survivors.length, 3);
    assert.ok(isSiblingGroupValid(siblingSum(survivors)));
    const a = survivors.find((s) => s.id === "a")!;
    assert.ok(Math.abs(a.weightPercent - 66.67) < 0.02);
  });

  it("single survivor becomes 100", () => {
    const { survivors } = prorateAfterDelete(
      [{ id: "a", weightPercent: 60 }, { id: "b", weightPercent: 40 }],
      "b"
    );
    assert.equal(survivors[0].weightPercent, 100);
  });
});
