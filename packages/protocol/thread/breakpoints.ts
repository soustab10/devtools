import { ThreadFront } from "./thread";

export async function removeBreakpoint(initialSourceId: SourceId, line: number, column: number) {
  // await this.ensureAllSources();
  // const sourceIds = this.getCorrespondingSourceIds(initialSourceId);
  for (const [breakpointId, { location }] of this.breakpoints.entries()) {
    if (
      sourceIds.includes(location.sourceId) &&
      location.line == line &&
      location.column == column
    ) {
      this.breakpoints.delete(breakpointId);
      ThreadFront.invalidateResumeTargets(async () => {
        assert(this.sessionId, "no sessionId");
        await client.Debugger.removeBreakpoint({ breakpointId }, this.sessionId);
      });
    }
  }
}