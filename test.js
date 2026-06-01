const assert = require("node:assert/strict");
const {
  buildJsonBackup,
  calculateBudget,
  buildChecklist,
  buildMarkdown,
  defaultState,
  formatNumber,
  parseJsonBackup,
  roundingHint,
  resultSentence
} = require("./app.js");

function near(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} was not near ${expected}`);
}

{
  const state = {
    quantityName: "Test mass",
    resultValue: 10,
    resultUnit: "g",
    coverageFactor: 2,
    rows: [
      { source: "repeatability", type: "Type A", estimate: 3, rule: "standard", sensitivity: 1, note: "" },
      { source: "resolution", type: "Resolution", estimate: Math.sqrt(12), rule: "resolution", sensitivity: 2, note: "" }
    ]
  };
  const result = calculateBudget(state);
  near(result.rows.find((row) => row.source === "repeatability").weighted, 3);
  near(result.rows.find((row) => row.source === "resolution").weighted, 2);
  near(result.combined, Math.sqrt(13));
  near(result.expanded, Math.sqrt(13) * 2);
  near(result.relative, (Math.sqrt(13) * 2) / 10 * 100);
  assert.equal(result.rows[0].source, "repeatability");
}

{
  const state = defaultState();
  const result = calculateBudget(state);
  assert.equal(result.quantityName, "Aluminum block density");
  assert.ok(result.rows.length >= 4);
  assert.match(resultSentence(result), /Aluminum block density/);
  assert.match(resultSentence(result), /\+\/-/);
  assert.ok(buildChecklist(result).some((item) => item.includes(result.rows[0].source)));
  assert.match(roundingHint(result), /^Use /);
}

{
  const markdown = buildMarkdown(defaultState());
  assert.match(markdown, /^# Aluminum block density uncertainty budget/);
  assert.match(markdown, /Report sentence:/);
  assert.match(markdown, /Rounding hint:/);
  assert.match(markdown, /Variance share/);
  assert.match(markdown, /does not prove a measurement model/);
}

{
  const result = calculateBudget({
    quantityName: "Test mass",
    resultValue: 12.345,
    resultUnit: "g",
    coverageFactor: 2,
    rows: [{ source: "repeatability", type: "Type A", estimate: 0.063, rule: "standard", sensitivity: 1, note: "" }]
  });
  assert.equal(roundingHint(result), "Use 12.35 +/- 0.13 g.");
  const empty = calculateBudget({ quantityName: "Empty", resultValue: 1, resultUnit: "", coverageFactor: 2, rows: [] });
  assert.equal(roundingHint(empty), "Add sources first.");
}

{
  const backup = buildJsonBackup({
    quantityName: "Pipe flow",
    resultValue: "42",
    resultUnit: "L/min",
    coverageFactor: "2.2",
    rows: [
      { source: "meter | calibration", type: "Calibration", estimate: "0.18", rule: "normal95", sensitivity: "1.5", note: "vendor cert" }
    ]
  });
  const parsed = parseJsonBackup(backup);
  assert.equal(parsed.quantityName, "Pipe flow");
  assert.equal(parsed.resultValue, 42);
  assert.equal(parsed.coverageFactor, 2.2);
  assert.equal(parsed.rows[0].source, "meter | calibration");
  assert.equal(parsed.rows[0].estimate, 0.18);
  assert.match(backup, /"schemaVersion": 1/);
}

{
  assert.throws(() => parseJsonBackup('{"state":{"quantityName":"Missing rows"}}'), /does not contain/);
}

{
  assert.equal(formatNumber(0), "0");
  assert.equal(formatNumber(Number.NaN), "n/a");
  assert.equal(formatNumber(12345), "1.23e+4");
}

console.log("All uncertainty budget checks passed.");
