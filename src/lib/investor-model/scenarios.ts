import { Assumptions, V6_DEFAULTS } from "./assumptions";

export type ScenarioId = "bear" | "base" | "bull";

export const SCENARIOS: Record<ScenarioId, { label: string; description: string; overrides: Partial<Assumptions> }> = {
  bear: {
    label: "Bear",
    description: "Slower creator activation, weaker conversion. ~40% of base case GBV.",
    overrides: {
      somSharePctByYear: [0.0004, 0.0018, 0.0048, 0.009, 0.014],
      creatorsActiveByYear: [300, 1_200, 3_200, 6_500, 11_000],
      gbvPerActiveCreator: 14_000,
    },
  },
  base: {
    label: "Base",
    description: "v6 default assumptions from the workbook.",
    overrides: {},
  },
  bull: {
    label: "Bull",
    description: "Faster viral loop, higher ABV. ~1.6x of base case GBV.",
    overrides: {
      somSharePctByYear: [0.0012, 0.0055, 0.0148, 0.028, 0.044],
      creatorsActiveByYear: [700, 3_400, 9_800, 20_000, 34_000],
      gbvPerActiveCreator: 22_500,
      avgBookingValue: 560,
    },
  },
};

export function applyScenario(base: Assumptions, id: ScenarioId): Assumptions {
  return { ...base, ...SCENARIOS[id].overrides };
}

export function defaultsFor(id: ScenarioId): Assumptions {
  return { ...V6_DEFAULTS, ...SCENARIOS[id].overrides };
}