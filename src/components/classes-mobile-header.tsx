"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type DependencyList,
  type ReactNode,
} from "react";

const MobileSlotContext = createContext<ReactNode>(null);
const SetMobileSlotContext = createContext<((node: ReactNode) => void) | null>(null);
const DesktopSlotContext = createContext<ReactNode>(null);
const SetDesktopSlotContext = createContext<((node: ReactNode) => void) | null>(null);

export function ClassesMobileHeaderProvider({ children }: { children: ReactNode }) {
  const [mobileSlot, setMobileSlot] = useState<ReactNode>(null);
  const [desktopSlot, setDesktopSlot] = useState<ReactNode>(null);
  return (
    <SetDesktopSlotContext.Provider value={setDesktopSlot}>
      <SetMobileSlotContext.Provider value={setMobileSlot}>
        <DesktopSlotContext.Provider value={desktopSlot}>
          <MobileSlotContext.Provider value={mobileSlot}>{children}</MobileSlotContext.Provider>
        </DesktopSlotContext.Provider>
      </SetMobileSlotContext.Provider>
    </SetDesktopSlotContext.Provider>
  );
}

export function useClassesMobileHeaderSlot() {
  return useContext(MobileSlotContext);
}

export function useClassesDesktopHeaderSlot() {
  return useContext(DesktopSlotContext);
}

export function useRegisterClassesMobileHeader(render: () => ReactNode, deps: DependencyList) {
  const setSlot = useContext(SetMobileSlotContext);
  useEffect(() => {
    if (!setSlot) return;
    setSlot(render());
    return () => setSlot(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies deps
  }, [setSlot, ...deps]);
}

export function useRegisterClassesDesktopHeader(render: () => ReactNode, deps: DependencyList) {
  const setSlot = useContext(SetDesktopSlotContext);
  useEffect(() => {
    if (!setSlot) return;
    setSlot(render());
    return () => setSlot(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies deps
  }, [setSlot, ...deps]);
}
