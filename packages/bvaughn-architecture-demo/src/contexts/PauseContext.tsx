import { PauseId } from "@replayio/protocol";
import { createContext, PropsWithChildren, useMemo, useState } from "react";

export type PauseContextType = {
  pauseId: PauseId | null;
  update: (pauseId: PauseId | null) => void;
};

export const PauseContext = createContext<PauseContextType>(null as any);

export function PauseContextRoot({ children }: PropsWithChildren<{}>) {
  const [pauseId, setPauseId] = useState<PauseId | null>(null);
  const context = useMemo(() => ({ pauseId, update: setPauseId }), [pauseId]);

  return <PauseContext.Provider value={context}>{children}</PauseContext.Provider>;
}
