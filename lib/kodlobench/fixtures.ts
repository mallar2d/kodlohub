/**
 * SYNTHETIC DATA. Not real KodloBench results.
 *
 * Exists only to check the interface (long names, equal-model configurations,
 * real zeros vs. missing values, a single-record category, an empty category).
 * Loaded exclusively by `source.ts` in non-production builds with
 * KODLOBENCH_SYNTHETIC=1, and the validator rejects `synthetic-` ids in the published file.
 */
export const SYNTHETIC_FILE = {
  schemaVersion: 1,
  updatedAt: null,
  currency: "USD",
  results: [
  {
    "id": "synthetic-pdrbench-pro-synthetic-model-a-synthetic-cli-1-default",
    "category": "pdrbench-pro",
    "model": "Synthetic Model A",
    "agent": "Synthetic CLI 1",
    "config": "default",
    "score": 20,
    "timeSeconds": 120,
    "tokens": 30000,
    "cost": 0.2,
    "metrics": [
      {
        "label": "Synthetic metric",
        "value": 12.5,
        "unit": "pts"
      },
      {
        "label": "Synthetic text metric",
        "value": "example"
      }
    ],
    "notes": "Synthetic record. Notes appear only when the owner publishes them.",
    "publishedAt": "2026-01-01"
  },
  {
    "id": "synthetic-pdrbench-pro-synthetic-model-a-synthetic-cli-1-high",
    "category": "pdrbench-pro",
    "model": "Synthetic Model A",
    "agent": "Synthetic CLI 1",
    "config": "high",
    "score": 26,
    "timeSeconds": 1020,
    "tokens": 330000,
    "cost": 2.7
  },
  {
    "id": "synthetic-pdrbench-pro-synthetic-model-a-synthetic-cli-1-low",
    "category": "pdrbench-pro",
    "model": "Synthetic Model A",
    "agent": "Synthetic CLI 1",
    "config": "low",
    "score": 14,
    "timeSeconds": 60,
    "tokens": 20000,
    "cost": 0.1
  },
  {
    "id": "synthetic-pdrbench-pro-synthetic-model-b-synthetic-cli-2-default",
    "category": "pdrbench-pro",
    "model": "Synthetic Model B",
    "agent": "Synthetic CLI 2",
    "config": "default",
    "score": 29,
    "timeSeconds": 293,
    "tokens": 118000,
    "cost": 2.05
  },
  {
    "id": "synthetic-pdrbench-pro-synthetic-model-b-synthetic-cli-2-high",
    "category": "pdrbench-pro",
    "model": "Synthetic Model B",
    "agent": "Synthetic CLI 2",
    "config": "high",
    "score": 35,
    "timeSeconds": 1193,
    "tokens": 418000,
    "cost": 4.55
  },
  {
    "id": "synthetic-pdrbench-pro-synthetic-model-b-synthetic-cli-2-low",
    "category": "pdrbench-pro",
    "model": "Synthetic Model B",
    "agent": "Synthetic CLI 2",
    "config": "low",
    "score": 23,
    "timeSeconds": 233,
    "tokens": 108000,
    "cost": 1.95
  },
  {
    "id": "synthetic-pdrbench-pro-synthetic-model-c-synthetic-cli-1-default",
    "category": "pdrbench-pro",
    "model": "Synthetic Model C",
    "agent": "Synthetic CLI 1",
    "config": "default",
    "score": 38,
    "timeSeconds": 466,
    "tokens": 206000,
    "cost": 3.9
  },
  {
    "id": "synthetic-pdrbench-pro-synthetic-model-d-synthetic-cli-2-default",
    "category": "pdrbench-pro",
    "model": "Synthetic Model D",
    "agent": "Synthetic CLI 2",
    "config": "default",
    "score": 47,
    "timeSeconds": 639,
    "tokens": 294000,
    "cost": 0.75
  },
  {
    "id": "synthetic-pdrbench-pro-synthetic-model-e-synthetic-cli-1-default",
    "category": "pdrbench-pro",
    "model": "Synthetic Model E",
    "agent": "Synthetic CLI 1",
    "config": "default",
    "score": 56,
    "timeSeconds": 812,
    "tokens": 382000,
    "cost": 2.6
  },
  {
    "id": "synthetic-pdrbench-pro-synthetic-model-with-a-very-lo-synthetic-cli-2-default",
    "category": "pdrbench-pro",
    "model": "Synthetic Model with a very long display name for layout checks",
    "agent": "Synthetic CLI 2",
    "config": "default",
    "score": 65,
    "timeSeconds": 985,
    "tokens": 470000,
    "cost": 4.45
  },
  {
    "id": "synthetic-redotui-bench-synthetic-model-a-synthetic-cli-2-default",
    "category": "redotui-bench",
    "model": "Synthetic Model A",
    "agent": "Synthetic CLI 2",
    "config": "default",
    "score": 25,
    "timeSeconds": 211,
    "tokens": 71000,
    "cost": 0.75
  },
  {
    "id": "synthetic-redotui-bench-synthetic-model-a-synthetic-cli-2-high",
    "category": "redotui-bench",
    "model": "Synthetic Model A",
    "agent": "Synthetic CLI 2",
    "config": "high",
    "score": 31,
    "timeSeconds": 1111,
    "tokens": 371000,
    "cost": 3.25
  },
  {
    "id": "synthetic-redotui-bench-synthetic-model-a-synthetic-cli-2-low",
    "category": "redotui-bench",
    "model": "Synthetic Model A",
    "agent": "Synthetic CLI 2",
    "config": "low",
    "score": 19,
    "timeSeconds": 151,
    "tokens": 61000,
    "cost": 0.65
  },
  {
    "id": "synthetic-redotui-bench-synthetic-model-b-synthetic-cli-1-default",
    "category": "redotui-bench",
    "model": "Synthetic Model B",
    "agent": "Synthetic CLI 1",
    "config": "default",
    "score": 34,
    "timeSeconds": 384,
    "tokens": 159000,
    "cost": 2.6
  },
  {
    "id": "synthetic-redotui-bench-synthetic-model-b-synthetic-cli-1-high",
    "category": "redotui-bench",
    "model": "Synthetic Model B",
    "agent": "Synthetic CLI 1",
    "config": "high",
    "score": 40,
    "timeSeconds": 1284,
    "tokens": 459000,
    "cost": 5.1
  },
  {
    "id": "synthetic-redotui-bench-synthetic-model-b-synthetic-cli-1-low",
    "category": "redotui-bench",
    "model": "Synthetic Model B",
    "agent": "Synthetic CLI 1",
    "config": "low",
    "score": 28,
    "timeSeconds": 324,
    "tokens": 149000,
    "cost": 2.5
  },
  {
    "id": "synthetic-redotui-bench-synthetic-model-c-synthetic-cli-2-default",
    "category": "redotui-bench",
    "model": "Synthetic Model C",
    "agent": "Synthetic CLI 2",
    "config": "default",
    "score": 43,
    "timeSeconds": 557,
    "tokens": 247000,
    "cost": 4.45
  },
  {
    "id": "synthetic-redotui-bench-synthetic-model-d-synthetic-cli-1-default",
    "category": "redotui-bench",
    "model": "Synthetic Model D",
    "agent": "Synthetic CLI 1",
    "config": "default",
    "score": 52,
    "timeSeconds": 730,
    "tokens": 335000,
    "cost": 1.3
  },
  {
    "id": "synthetic-redotui-bench-synthetic-model-e-synthetic-cli-2-default",
    "category": "redotui-bench",
    "model": "Synthetic Model E",
    "agent": "Synthetic CLI 2",
    "config": "default",
    "score": 61,
    "timeSeconds": 903,
    "tokens": 423000,
    "cost": 3.15
  },
  {
    "id": "synthetic-redotui-bench-synthetic-model-with-a-very-lo-synthetic-cli-1-default",
    "category": "redotui-bench",
    "model": "Synthetic Model with a very long display name for layout checks",
    "agent": "Synthetic CLI 1",
    "config": "default",
    "score": 70,
    "timeSeconds": 1076,
    "tokens": 511000,
    "cost": 5.0
  },
  {
    "id": "synthetic-utwmr-rec-bench-synthetic-model-a-synthetic-cli-1-default",
    "category": "utwmr-rec-bench",
    "model": "Synthetic Model A",
    "agent": "Synthetic CLI 1",
    "config": "default",
    "score": 30,
    "timeSeconds": 302,
    "tokens": 112000,
    "cost": 1.3
  },
  {
    "id": "synthetic-utwmr-rec-bench-synthetic-model-a-synthetic-cli-1-high",
    "category": "utwmr-rec-bench",
    "model": "Synthetic Model A",
    "agent": "Synthetic CLI 1",
    "config": "high",
    "score": 36,
    "timeSeconds": 1202,
    "tokens": 412000,
    "cost": 3.8
  },
  {
    "id": "synthetic-utwmr-rec-bench-synthetic-model-a-synthetic-cli-1-low",
    "category": "utwmr-rec-bench",
    "model": "Synthetic Model A",
    "agent": "Synthetic CLI 1",
    "config": "low",
    "score": 24,
    "timeSeconds": 242,
    "tokens": 102000,
    "cost": 1.2
  },
  {
    "id": "synthetic-utwmr-rec-bench-synthetic-model-b-synthetic-cli-2-default",
    "category": "utwmr-rec-bench",
    "model": "Synthetic Model B",
    "agent": "Synthetic CLI 2",
    "config": "default",
    "score": 39,
    "timeSeconds": 475,
    "tokens": 200000,
    "cost": 3.15
  },
  {
    "id": "synthetic-utwmr-rec-bench-synthetic-model-b-synthetic-cli-2-high",
    "category": "utwmr-rec-bench",
    "model": "Synthetic Model B",
    "agent": "Synthetic CLI 2",
    "config": "high",
    "score": 45,
    "timeSeconds": 1375,
    "tokens": 500000,
    "cost": 5.65
  },
  {
    "id": "synthetic-utwmr-rec-bench-synthetic-model-b-synthetic-cli-2-low",
    "category": "utwmr-rec-bench",
    "model": "Synthetic Model B",
    "agent": "Synthetic CLI 2",
    "config": "low",
    "score": 33,
    "timeSeconds": 415,
    "tokens": 190000,
    "cost": 3.05
  },
  {
    "id": "synthetic-utwmr-rec-bench-synthetic-model-c-synthetic-cli-1-default",
    "category": "utwmr-rec-bench",
    "model": "Synthetic Model C",
    "agent": "Synthetic CLI 1",
    "config": "default",
    "score": 48,
    "timeSeconds": 648,
    "tokens": 288000,
    "cost": 5.0
  },
  {
    "id": "synthetic-utwmr-rec-bench-synthetic-model-d-synthetic-cli-2-default",
    "category": "utwmr-rec-bench",
    "model": "Synthetic Model D",
    "agent": "Synthetic CLI 2",
    "config": "default",
    "score": 57,
    "timeSeconds": 821,
    "tokens": 376000,
    "cost": 1.85
  },
  {
    "id": "synthetic-utwmr-rec-bench-synthetic-model-e-synthetic-cli-1-default",
    "category": "utwmr-rec-bench",
    "model": "Synthetic Model E",
    "agent": "Synthetic CLI 1",
    "config": "default",
    "score": 66,
    "timeSeconds": 994,
    "tokens": 464000,
    "cost": 3.7
  },
  {
    "id": "synthetic-utwmr-rec-bench-synthetic-model-with-a-very-lo-synthetic-cli-2-default",
    "category": "utwmr-rec-bench",
    "model": "Synthetic Model with a very long display name for layout checks",
    "agent": "Synthetic CLI 2",
    "config": "default",
    "score": 20,
    "timeSeconds": 1167,
    "tokens": 552000,
    "cost": 0.55
  },
  {
    "id": "synthetic-pdrbench-pro-synthetic-model-zero-synthetic-cli-1-default",
    "category": "pdrbench-pro",
    "model": "Synthetic Model Zero",
    "agent": "Synthetic CLI 1",
    "config": "default",
    "score": 0,
    "timeSeconds": 0,
    "tokens": 0,
    "cost": 0
  },
  {
    "id": "synthetic-pdrbench-pro-synthetic-model-missing-synthetic-cli-2-default",
    "category": "pdrbench-pro",
    "model": "Synthetic Model Missing",
    "agent": "Synthetic CLI 2",
    "config": "default",
    "score": null,
    "timeSeconds": null,
    "tokens": null,
    "cost": null
  },
  {
    "id": "synthetic-pdrbench-pro-synthetic-model-partial-synthetic-cli-2-None",
    "category": "pdrbench-pro",
    "model": "Synthetic Model Partial",
    "agent": "Synthetic CLI 2",
    "config": null,
    "score": 47.5,
    "timeSeconds": null,
    "tokens": 250000,
    "cost": null
  },
  {
    "id": "synthetic-3dsc-gt-plus-synthetic-model-a-synthetic-cli-1-default",
    "category": "3dsc-gt-plus",
    "model": "Synthetic Model A",
    "agent": "Synthetic CLI 1",
    "config": "default",
    "score": 55,
    "timeSeconds": 1800,
    "tokens": 420000,
    "cost": 3.1
  }
],
};
