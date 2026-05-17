import { useCallback, useEffect, useState } from "react";
import { Assumptions, V6_DEFAULTS } from "./assumptions";
import { applyScenario, ScenarioId, SCENARIOS } from "./scenarios";

const STORAGE_KEY = "travidz.investor.assumptions.v1";
const SCENARIO_KEY = "travidz.investor.scenario.v1";

function load(): { assumptions: Assumptions; scenario: ScenarioId } {
  if (typeof window === "undefined") return { assumptions: V6_DEFAULTS, scenario: "base" };
  try {
    const sc = (window.localStorage.getItem(SCENARIO_KEY) as ScenarioId | null) ?? "base";
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const a = raw ? (JSON.parse(raw) as Assumptions) : applyScenario(V6_DEFAULTS, sc);
    return { assumptions: { ...V6_DEFAULTS, ...a }, scenario: sc };
  } catch {
    return { assumptions: V6_DEFAULTS, scenario: "base" };
  }
}

export function useInvestorAssumptions() {
  const [state, setState] = useState<{ assumptions: Assumptions; scenario: ScenarioId }>(() => load());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.assumptions));
    window.localStorage.setItem(SCENARIO_KEY, state.scenario);
  }, [state]);

  const update = useCallback(
    (patch: Partial<Assumptions> | ((a: Assumptions) => Partial<Assumptions>)) => {
      setState((s) => {
        const p = typeof patch === "function" ? patch(s.assumptions) : patch;
        return { ...s, assumptions: { ...s.assumptions, ...p } };
      });
    },
    [],
  );

  const setScenario = useCallback((id: ScenarioId) => {
    setState({ scenario: id, assumptions: applyScenario(V6_DEFAULTS, id) });
  }, []);

  const reset = useCallback(() => {
    setState({ scenario: "base", assumptions: V6_DEFAULTS });
  }, []);

  return { ...state, update, setScenario, reset, scenarios: SCENARIOS };
}