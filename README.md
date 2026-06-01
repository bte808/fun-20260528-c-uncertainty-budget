# Uncertainty Budget

Uncertainty Budget is a small local worksheet for lab reports and measurement review. Enter the headline measurement result, list uncertainty sources, choose simple distribution rules, and it produces a combined uncertainty, contribution ranking, study prompts, and a Markdown report.

It runs as a static HTML/CSS/JS app. There are no accounts, keys, uploads, trackers, or external runtime services.

## What It Can Do

- Convert common uncertainty estimates into standard uncertainties.
- Combine independent sources with sensitivity coefficients.
- Show the largest variance contributors as a ranked bar chart.
- Draft a report sentence such as `density: 2.708 +/- 0.13 g/cm^3 (k = 2)`.
- Suggest a final-report rounding line so the value and expanded uncertainty use the same decimal place.
- Generate review prompts for missing repeatability, model assumptions, or dominant sources.
- Copy or download a Markdown uncertainty budget for a lab notebook.
- Import or export a JSON backup of the current worksheet.
- Save the current draft only in local browser storage.

## Good Study And Research Uses

- Preparing a physics, chemistry, metrology, or engineering lab report.
- Checking whether an experiment notebook clearly separates Type A, Type B, calibration, resolution, and model sources.
- Comparing which instrument or procedure dominates the uncertainty before improving the experiment.
- Turning a terse calibration-note calculation into a readable study artifact.
- Practicing the structure of an uncertainty budget before using a formal spreadsheet or lab template.

## Why It Is Useful

Students often memorize the final `value +/- uncertainty` line without seeing which assumption controls it. This tool makes the budget inspectable: every estimate has a conversion rule, every sensitivity coefficient is visible, and the largest contributor is surfaced before the report text is copied.

The worksheet now also gives a cautious rounding hint for the final report line. That makes it easier to move from a scratch calculation to a readable lab-note statement without pretending to replace the course rubric or a formal metrology workflow.

This is intentionally not authoritative. It assumes independent sources and simple rules, does not derive the measurement model, does not validate distributions, and does not replace a textbook, lab manual, calibration certificate, GUM-compliant workflow, or instructor requirement. The bundled sample is example data only.

## Why It Is Interesting

Recent learning tools keep making hidden structure visible through graphs, ranked evidence, and local-first worksheets. Uncertainty budgets are a good fit for that pattern because the most useful learning question is often not "what is the answer?" but "which assumption makes the answer fragile?"

## Inspiration

Browsed on 2026-05-28 for recent public academic and measurement-learning tools. This project borrows only the general direction of local structured study aids and uncertainty-budget education; all code, UI, wording, and sample content here are original.

- NIST uncertainty overview and metrology resources: <https://www.nist.gov/programs-projects/measurement-uncertainty>
- NIST Uncertainty Machine, a public uncertainty-propagation tool: <https://uncertainty.nist.gov/>
- General uncertainty-budget calculator examples such as isobudgets: <https://www.isobudgets.com/uncertainty-calculator/>

## Run Locally

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 5182
```

Then open <http://localhost:5182/>.

## Validation

```bash
npm test
npm run check
```

The checks cover distribution conversion, sensitivity weighting, combined and expanded uncertainty, relative uncertainty, ranking, report text, Markdown output, JSON backup round-trips, and static JavaScript syntax.

## Core Usage

1. Load the sample to see the expected structure.
2. Replace the measurement name, value, unit, and coverage factor.
3. Add one row per uncertainty source.
4. Choose the conversion rule that matches how the estimate is stated.
5. Enter the sensitivity coefficient from your measurement model.
6. Read the largest contributors, rounding hint, and checklist.
7. Copy or download the Markdown report into your lab notes.
8. Export JSON if you want to reuse or share the editable worksheet later.

## Supported Rules

- Already standard uncertainty: use the entered value directly.
- 95% certificate: divide the entered expanded value by `2`.
- Rectangular half-width: divide by `sqrt(3)`.
- Triangular half-width: divide by `sqrt(6)`.
- Digital resolution step: divide by `sqrt(12)`.

## Later Extensions

- Optional correlated-source grouping.
- Simple sensitivity-coefficient notes tied to common measurement models.
- Class-example presets for common lab measurements.
