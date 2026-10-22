"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type DependencyList,
  type ReactNode,
} from "react";

const SlotContext = createContext<ReactNode>(null);
const SetSlotContext = createContext<((node: ReactNode) => void) | null>(null);

export function ClassesMobileHeaderProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<ReactNode>(null);
  return (
    <SetSlotContext.Provider value={setSlot}>
      <SlotContext.Provider value={slot}>{children}</SlotContext.Provider>
    </SetSlotContext.Provider>
  );
}

export function useClassesMobileHeaderSlot() {
  return useContext(SlotContext);
}

export function useRegisterClassesMobileHeader(render: () => ReactNode, deps: DependencyList) {
  const setSlot = useContext(SetSlotContext);
  useEffect(() => {
    if (!setSlot) return;
    setSlot(render());
    return () => setSlot(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies deps
  }, [setSlot, ...deps]);
}
