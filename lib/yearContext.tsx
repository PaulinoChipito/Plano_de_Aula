import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const YEAR_KEY = "current_year_v1";
const YEARS_LIST_KEY = "years_list_v1";

function getDefaultYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (m >= 9) return `${y}/${y + 1}`;
  return `${y - 1}/${y}`;
}

interface YearContextType {
  currentYear: string;
  years: string[];
  setYear: (y: string) => void;
  addYear: (label: string) => Promise<void>;
  isLatestYear: boolean;
}

const YearContext = createContext<YearContextType>({
  currentYear: "",
  years: [],
  setYear: () => {},
  addYear: async () => {},
  isLatestYear: true,
});

export function YearProvider({ children }: { children: ReactNode }) {
  const [currentYear, setCurrentYearState] = useState("");
  const [years, setYears] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(YEAR_KEY),
      AsyncStorage.getItem(YEARS_LIST_KEY),
    ]).then(([savedYear, savedList]) => {
      let list: string[] = savedList ? JSON.parse(savedList) : [];
      if (list.length === 0) {
        const defaultY = getDefaultYear();
        list = [defaultY];
        AsyncStorage.setItem(YEARS_LIST_KEY, JSON.stringify(list));
        AsyncStorage.setItem(YEAR_KEY, defaultY);
        setCurrentYearState(defaultY);
        setYears(list);
      } else {
        const year =
          savedYear && list.includes(savedYear)
            ? savedYear
            : list[list.length - 1];
        setCurrentYearState(year);
        setYears(list);
      }
    });
  }, []);

  const setYear = useCallback((y: string) => {
    setCurrentYearState(y);
    AsyncStorage.setItem(YEAR_KEY, y);
  }, []);

  const addYear = useCallback(
    async (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const newList = [...years.filter((y) => y !== trimmed), trimmed];
      setYears(newList);
      await AsyncStorage.setItem(YEARS_LIST_KEY, JSON.stringify(newList));
      setCurrentYearState(trimmed);
      await AsyncStorage.setItem(YEAR_KEY, trimmed);
    },
    [years],
  );

  const isLatestYear =
    years.length === 0 || currentYear === years[years.length - 1];

  return (
    <YearContext.Provider
      value={{ currentYear, years, setYear, addYear, isLatestYear }}
    >
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  return useContext(YearContext);
}
