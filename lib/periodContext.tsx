import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTeacherProfile } from "@/lib/storage";

const PERIOD_KEY = "current_period_v1";

export function getPeriodLabels(nivelEnsino: string): string[] {
  if (nivelEnsino === "Universidade") return ["I Sem", "II Sem"];
  return ["I Tri", "II Tri", "III Tri", "IV Tri"];
}

export function getPeriodKeys(nivelEnsino: string): string[] {
  if (nivelEnsino === "Universidade") return ["I", "II"];
  return ["I", "II", "III", "IV"];
}

interface PeriodContextType {
  currentPeriod: string;
  setPeriod: (p: string) => void;
  periodLabels: string[];
  periodKeys: string[];
  isHigherEd: boolean;
  currentPeriodLabel: string;
  refreshProfile: () => Promise<void>;
}

const PeriodContext = createContext<PeriodContextType>({
  currentPeriod: "I",
  setPeriod: () => {},
  periodLabels: ["I Tri", "II Tri", "III Tri", "IV Tri"],
  periodKeys: ["I", "II", "III", "IV"],
  isHigherEd: false,
  currentPeriodLabel: "I Tri",
  refreshProfile: async () => {},
});

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [currentPeriod, setCurrentPeriodState] = useState("I");
  const [nivelEnsino, setNivelEnsino] = useState("");

  const refreshProfile = useCallback(async () => {
    const profile = await getTeacherProfile();
    const keys = getPeriodKeys(profile.nivelEnsino);
    setNivelEnsino(profile.nivelEnsino);
    setCurrentPeriodState((prev) => (keys.includes(prev) ? prev : "I"));
  }, []);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(PERIOD_KEY), getTeacherProfile()]).then(
      ([savedPeriod, profile]) => {
        const keys = getPeriodKeys(profile.nivelEnsino);
        setNivelEnsino(profile.nivelEnsino);
        const period =
          savedPeriod && keys.includes(savedPeriod) ? savedPeriod : "I";
        setCurrentPeriodState(period);
      },
    );
  }, []);

  const setPeriod = useCallback((p: string) => {
    setCurrentPeriodState(p);
    AsyncStorage.setItem(PERIOD_KEY, p);
  }, []);

  const isHigherEd = nivelEnsino === "Universidade";
  const periodLabels = getPeriodLabels(nivelEnsino);
  const periodKeys = getPeriodKeys(nivelEnsino);
  const currentIdx = periodKeys.indexOf(currentPeriod);
  const currentPeriodLabel =
    currentIdx >= 0 ? periodLabels[currentIdx] : periodLabels[0];

  return (
    <PeriodContext.Provider
      value={{
        currentPeriod,
        setPeriod,
        periodLabels,
        periodKeys,
        isHigherEd,
        currentPeriodLabel,
        refreshProfile,
      }}
    >
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  return useContext(PeriodContext);
}
