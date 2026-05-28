(function boot(global) {
  "use strict";

  const STORAGE_KEY = "uncertainty-budget-draft-v1";

  const RULES = {
    standard: {
      label: "Already standard u",
      divisor: 1,
      explanation: "Entered value is already a standard uncertainty."
    },
    normal95: {
      label: "95% certificate, divide by 2",
      divisor: 2,
      explanation: "A typical expanded certificate value is converted with k = 2."
    },
    rectangular: {
      label: "Rectangular half-width, divide by sqrt(3)",
      divisor: Math.sqrt(3),
      explanation: "A bounded half-width is treated as uniformly distributed."
    },
    triangular: {
      label: "Triangular half-width, divide by sqrt(6)",
      divisor: Math.sqrt(6),
      explanation: "A bounded half-width is treated as triangularly distributed."
    },
    resolution: {
      label: "Digital resolution step, divide by sqrt(12)",
      divisor: Math.sqrt(12),
      explanation: "A display step is converted using step / sqrt(12)."
    }
  };

  const SAMPLE = {
    quantityName: "Aluminum block density",
    resultValue: 2.708,
    resultUnit: "g/cm^3",
    coverageFactor: 2,
    rows: [
      {
        source: "Mass repeatability",
        type: "Type A",
        estimate: 0.006,
        rule: "standard",
        sensitivity: 1,
        note: "Sample standard deviation of repeated balance readings"
      },
      {
        source: "Balance calibration certificate",
        type: "Calibration",
        estimate: 0.010,
        rule: "normal95",
        sensitivity: 1,
        note: "Certificate value reported with approximately 95% coverage"
      },
      {
        source: "Caliper resolution",
        type: "Resolution",
        estimate: 0.01,
        rule: "resolution",
        sensitivity: 4.8,
        note: "Length step propagated through the density model"
      },
      {
        source: "Block alignment",
        type: "Model",
        estimate: 0.004,
        rule: "rectangular",
        sensitivity: 3.2,
        note: "Half-width estimate for small placement differences"
      }
    ]
  };

  function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function cleanText(value) {
    return String(value || "").trim();
  }

  function normalizeRow(row) {
    return {
      source: cleanText(row.source) || "Unnamed source",
      type: cleanText(row.type) || "Type B",
      estimate: toNumber(row.estimate, 0),
      rule: RULES[row.rule] ? row.rule : "standard",
      sensitivity: toNumber(row.sensitivity, 1),
      note: cleanText(row.note)
    };
  }

  function calculateBudget(state) {
    const rows = (state.rows || []).map(normalizeRow).filter((row) => row.estimate !== 0);
    const items = rows.map((row) => {
      const rule = RULES[row.rule];
      const standard = Math.abs(row.estimate) / rule.divisor;
      const weighted = standard * Math.abs(row.sensitivity);
      const variance = weighted * weighted;
      return {
        ...row,
        ruleLabel: rule.label,
        standard,
        weighted,
        variance
      };
    });
    const totalVariance = items.reduce((sum, item) => sum + item.variance, 0);
    const combined = Math.sqrt(totalVariance);
    const k = Math.max(0, toNumber(state.coverageFactor, 2));
    const expanded = combined * k;
    const resultValue = toNumber(state.resultValue, NaN);
    const relative = Number.isFinite(resultValue) && resultValue !== 0 ? Math.abs(expanded / resultValue) * 100 : NaN;
    const ranked = items
      .map((item) => ({
        ...item,
        share: totalVariance > 0 ? (item.variance / totalVariance) * 100 : 0
      }))
      .sort((a, b) => b.variance - a.variance);
    return {
      quantityName: cleanText(state.quantityName) || "Measured quantity",
      resultValue,
      resultUnit: cleanText(state.resultUnit),
      coverageFactor: k,
      rows: ranked,
      combined,
      expanded,
      relative,
      totalVariance
    };
  }

  function formatNumber(value, digits = 3) {
    if (!Number.isFinite(value)) return "n/a";
    if (value === 0) return "0";
    const abs = Math.abs(value);
    if (abs >= 1000 || abs < 0.001) return value.toExponential(2);
    return Number(value.toPrecision(digits)).toString();
  }

  function resultSentence(result) {
    const unit = result.resultUnit ? ` ${result.resultUnit}` : "";
    const value = Number.isFinite(result.resultValue) ? formatNumber(result.resultValue, 5) : "value";
    const expanded = formatNumber(result.expanded, 3);
    return `${result.quantityName}: ${value} +/- ${expanded}${unit} (k = ${formatNumber(result.coverageFactor, 2)}).`;
  }

  function buildChecklist(result) {
    const prompts = [];
    if (!result.rows.length) {
      return [
        "Add at least one uncertainty source before using the report sentence.",
        "Keep estimates tied to a lab note, calibration certificate, instrument resolution, or repeated measurement."
      ];
    }
    const top = result.rows[0];
    prompts.push(`Inspect "${top.source}" first; it contributes ${formatNumber(top.share, 3)}% of the variance.`);
    if (top.share > 50) {
      prompts.push("One source dominates the budget. Check whether its estimate, distribution rule, and sensitivity coefficient are justified.");
    } else {
      prompts.push("No single source fully dominates. Review whether any missing source could change the ranking.");
    }
    const hasModel = result.rows.some((row) => row.type === "Model");
    if (!hasModel) {
      prompts.push("Consider whether the measurement model itself has a stated approximation or alignment source.");
    }
    const hasTypeA = result.rows.some((row) => row.type === "Type A");
    if (!hasTypeA) {
      prompts.push("If repeated readings exist, add a Type A row rather than hiding repeatability in a note.");
    }
    prompts.push("Treat this as a worksheet: confirm the final rounding, coverage factor, and assumptions against your course or lab standard.");
    return prompts;
  }

  function buildMarkdown(state) {
    const result = calculateBudget(state);
    const unit = result.resultUnit ? ` ${result.resultUnit}` : "";
    const lines = [
      `# ${result.quantityName} uncertainty budget`,
      "",
      `Report sentence: ${resultSentence(result)}`,
      "",
      `- Result value: ${Number.isFinite(result.resultValue) ? formatNumber(result.resultValue, 6) : "n/a"}${unit}`,
      `- Combined standard uncertainty: ${formatNumber(result.combined, 4)}${unit}`,
      `- Expanded uncertainty: ${formatNumber(result.expanded, 4)}${unit}`,
      `- Coverage factor: ${formatNumber(result.coverageFactor, 3)}`,
      `- Relative expanded uncertainty: ${Number.isFinite(result.relative) ? `${formatNumber(result.relative, 3)}%` : "n/a"}`,
      "",
      "## Sources",
      "",
      "| Source | Type | Estimate | Rule | Sensitivity | Standard u | Weighted u | Variance share | Note |",
      "| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | --- |"
    ];
    result.rows.forEach((row) => {
      lines.push([
        escapePipes(row.source),
        escapePipes(row.type),
        formatNumber(row.estimate, 4),
        escapePipes(row.ruleLabel),
        formatNumber(row.sensitivity, 4),
        formatNumber(row.standard, 4),
        formatNumber(row.weighted, 4),
        `${formatNumber(row.share, 3)}%`,
        escapePipes(row.note || "-")
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    });
    lines.push("", "## Review checklist", "");
    buildChecklist(result).forEach((item) => lines.push(`- ${item}`));
    lines.push(
      "",
      "## Caveat",
      "",
      "This worksheet does not prove a measurement model or replace a textbook, lab manual, calibration certificate, or instructor requirement. It only makes entered assumptions easier to inspect."
    );
    return lines.join("\n");
  }

  function escapePipes(value) {
    return String(value || "").replace(/\|/g, "\\|");
  }

  function defaultState() {
    return JSON.parse(JSON.stringify(SAMPLE));
  }

  function readDomState(dom) {
    const rows = Array.from(dom.rowsBody.querySelectorAll("tr")).map((tr) => {
      const get = (field) => tr.querySelector(`[data-field="${field}"]`).value;
      return {
        source: get("source"),
        type: get("type"),
        estimate: get("estimate"),
        rule: get("rule"),
        sensitivity: get("sensitivity"),
        note: get("note")
      };
    });
    return {
      quantityName: dom.quantityName.value,
      resultValue: dom.resultValue.value,
      resultUnit: dom.resultUnit.value,
      coverageFactor: dom.coverageFactor.value,
      rows
    };
  }

  function writeState(dom, state) {
    dom.quantityName.value = state.quantityName || "";
    dom.resultValue.value = state.resultValue ?? "";
    dom.resultUnit.value = state.resultUnit || "";
    dom.coverageFactor.value = state.coverageFactor ?? 2;
    dom.rowsBody.innerHTML = "";
    (state.rows || []).forEach((row) => appendRow(dom, row));
  }

  function appendRow(dom, row = {}) {
    const fragment = dom.rowTemplate.content.cloneNode(true);
    const tr = fragment.querySelector("tr");
    const normalized = normalizeRow({ sensitivity: 1, ...row });
    Object.entries(normalized).forEach(([field, value]) => {
      const input = tr.querySelector(`[data-field="${field}"]`);
      if (input) input.value = value;
    });
    tr.querySelector(".remove-row").addEventListener("click", () => {
      tr.remove();
      render(dom);
    });
    tr.querySelectorAll("input, select").forEach((input) => input.addEventListener("input", () => render(dom)));
    dom.rowsBody.appendChild(fragment);
  }

  function render(dom) {
    const state = readDomState(dom);
    const result = calculateBudget(state);
    dom.verdictText.textContent = resultSentence(result);
    const unit = result.resultUnit ? ` ${result.resultUnit}` : "";
    dom.combinedValue.textContent = `${formatNumber(result.combined, 4)}${unit}`;
    dom.expandedValue.textContent = `${formatNumber(result.expanded, 4)}${unit}`;
    dom.relativeValue.textContent = Number.isFinite(result.relative) ? `${formatNumber(result.relative, 3)}%` : "n/a";
    renderBars(dom, result);
    renderChecklist(dom, result);
    dom.markdownOut.value = buildMarkdown(state);
    saveDraft(state, dom);
  }

  function renderBars(dom, result) {
    dom.bars.innerHTML = "";
    if (!result.rows.length) {
      dom.bars.textContent = "Add rows to see contribution ranking.";
      return;
    }
    result.rows.slice(0, 6).forEach((row) => {
      const wrapper = document.createElement("div");
      wrapper.className = "bar-row";
      const label = document.createElement("div");
      label.className = "bar-label";
      label.innerHTML = `<span>${row.source}</span><span>${formatNumber(row.share, 3)}%</span>`;
      const track = document.createElement("div");
      track.className = "bar-track";
      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = `${Math.max(2, Math.min(row.share, 100))}%`;
      track.appendChild(fill);
      wrapper.append(label, track);
      dom.bars.appendChild(wrapper);
    });
  }

  function renderChecklist(dom, result) {
    dom.checklist.innerHTML = "";
    buildChecklist(result).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      dom.checklist.appendChild(li);
    });
  }

  function saveDraft(state, dom) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      dom.saveState.textContent = "Draft saved locally";
    } catch (error) {
      dom.saveState.textContent = "Draft not saved";
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function copyReport(text, textarea) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return "copied";
      } catch (error) {
        // Continue to the selection fallback below.
      }
    }
    textarea.focus();
    textarea.select();
    try {
      return document.execCommand("copy") ? "copied" : "selected";
    } catch (error) {
      return "selected";
    }
  }

  function wireBrowser() {
    const dom = {
      quantityName: document.querySelector("#quantityName"),
      resultValue: document.querySelector("#resultValue"),
      resultUnit: document.querySelector("#resultUnit"),
      coverageFactor: document.querySelector("#coverageFactor"),
      rowsBody: document.querySelector("#rowsBody"),
      rowTemplate: document.querySelector("#rowTemplate"),
      verdictText: document.querySelector("#verdictText"),
      combinedValue: document.querySelector("#combinedValue"),
      expandedValue: document.querySelector("#expandedValue"),
      relativeValue: document.querySelector("#relativeValue"),
      bars: document.querySelector("#bars"),
      checklist: document.querySelector("#checklist"),
      markdownOut: document.querySelector("#markdownOut"),
      saveState: document.querySelector("#saveState")
    };

    writeState(dom, loadDraft() || defaultState());
    document.querySelectorAll("#quantityName, #resultValue, #resultUnit, #coverageFactor").forEach((input) => {
      input.addEventListener("input", () => render(dom));
    });
    document.querySelector("#sampleBtn").addEventListener("click", () => {
      writeState(dom, defaultState());
      render(dom);
    });
    document.querySelector("#addBtn").addEventListener("click", () => {
      appendRow(dom, {
        source: "New source",
        type: "Type B",
        estimate: 0.001,
        rule: "standard",
        sensitivity: 1,
        note: ""
      });
      render(dom);
    });
    document.querySelector("#clearBtn").addEventListener("click", () => {
      dom.rowsBody.innerHTML = "";
      render(dom);
    });
    document.querySelector("#copyBtn").addEventListener("click", async () => {
      const status = await copyReport(dom.markdownOut.value, dom.markdownOut);
      dom.saveState.textContent = status === "copied" ? "Report copied" : "Report selected";
      setTimeout(() => render(dom), 900);
    });
    document.querySelector("#downloadBtn").addEventListener("click", () => {
      const state = readDomState(dom);
      const slug = cleanText(state.quantityName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "uncertainty-budget";
      download(`${slug}-uncertainty-budget.md`, dom.markdownOut.value);
    });
    render(dom);
  }

  const api = {
    RULES,
    SAMPLE,
    calculateBudget,
    buildChecklist,
    buildMarkdown,
    copyReport,
    defaultState,
    formatNumber,
    resultSentence
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.UncertaintyBudget = api;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", wireBrowser);
    } else {
      wireBrowser();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
