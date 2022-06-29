import { createContext, ReactNode, useContext } from "react";
import { TestRun, useGetTestRunsForWorkspace } from "ui/hooks/tests";
import { useGetTeamRouteParams } from "ui/utils/library";
import { TeamContext } from "../../TeamContext";

type TestRunsContextType = {
  focusId: string;
  testRuns: TestRun[] | null;
};

export const TestRunsContext = createContext<TestRunsContextType>(null as any);

export function TestRunsContainer({ children }: { children: ReactNode }) {
  const { focusId } = useGetTeamRouteParams();
  const { teamId } = useContext(TeamContext);
  const { testRuns } = useGetTestRunsForWorkspace(teamId);

  return (
    <TestRunsContext.Provider value={{ focusId, testRuns }}>{children}</TestRunsContext.Provider>
  );
}
