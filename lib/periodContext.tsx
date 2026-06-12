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
import { Language, translations, useLanguage } from "@/lib/i18n";

const PERIOD_KEY = "current_period_v1";

export function getPeriodLabels(nivelEnsino: string, lang: Language = "pt"): string[] {
  const tr = translations[lang] ?? translations.pt;
  if (nivelEnsino === "Universidade") {
    return [tr.periodFirstSemester, tr.periodSecondSemester];
  }
  return [
    tr.periodFirstTrimester,
    tr.periodSecondTrimester,
    tr.periodThirdTrimester,
  ];
}

export function getPeriodKeys(nivelEnsino: string): string[] {
  if (nivelEnsino === "Universidade") return ["I", "II"];
  return ["I", "II", "III"];
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
  periodLabels: ["I Trimestre", "II Trimestre", "III Trimestre"],
  periodKeys: ["I", "II", "III"],
  isHigherEd: false,
  currentPeriodLabel: "I Trimestre",
  refreshProfile: async () => {},
});

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [currentPeriod, setCurrentPeriodState] = useState("I");
  const [nivelEnsino, setNivelEnsino] = useState("");
  const { lang } = useLanguage();

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
  const periodLabels = getPeriodLabels(nivelEnsino, lang);
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
