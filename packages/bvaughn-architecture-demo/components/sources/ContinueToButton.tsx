import Icon from "@bvaughn/components/Icon";
import { FocusContext } from "@bvaughn/src/contexts/FocusContext";
import { TimelineContext } from "@bvaughn/src/contexts/TimelineContext";
import { getHitPointsForLocation } from "@bvaughn/src/suspense/PointsCache";
import { ExecutionPoint, SourceId, TimeStampedPoint } from "@replayio/protocol";
import findLast from "lodash/findLast";
import memoize from "lodash/memoize";
import { compareNumericStrings } from "protocol/utils";
import { useContext, useMemo } from "react";
import { ReplayClientContext } from "shared/client/ReplayClientContext";
import { LineHitCounts } from "shared/client/types";

const memoizedFind = memoize((hitPoints: TimeStampedPoint[], executionPoint: ExecutionPoint) => {
  return hitPoints.find(point => compareNumericStrings(point.point, executionPoint) > 0);
});

const memoizedFindLast = memoize(
  (hitPoints: TimeStampedPoint[], executionPoint: ExecutionPoint) => {
    return findLast(hitPoints, point => compareNumericStrings(point.point, executionPoint) < 0);
  }
);

export default function ContinueToButton({
  buttonClassName,
  iconClassName,
  lineHitCounts,
  lineNumber,
  sourceId,
  type,
}: {
  buttonClassName: string;
  iconClassName: string;
  lineHitCounts: LineHitCounts;
  lineNumber: number;
  sourceId: SourceId;
  type: "next" | "previous";
}) {
  const { range: focusRange } = useContext(FocusContext);
  const client = useContext(ReplayClientContext);
  const { executionPoint, update } = useContext(TimelineContext);

  const location = useMemo(
    () => ({
      column: lineHitCounts.firstBreakableColumnIndex,
      line: lineNumber,
      sourceId,
    }),
    [lineHitCounts, lineNumber, sourceId]
  );

  const [hitPoints, hitPointStatus] = getHitPointsForLocation(client, location, null, focusRange);

  let targetPoint: TimeStampedPoint | null = null;
  if (hitPointStatus !== "too-many-points-to-find") {
    targetPoint =
      type === "next"
        ? memoizedFind(hitPoints, executionPoint) || null
        : memoizedFindLast(hitPoints, executionPoint) || null;
  }

  const disabled = targetPoint == null;

  const onClick = () => {
    if (targetPoint != null) {
      update(targetPoint.time, targetPoint.point);
    }
  };

  return (
    <button
      className={buttonClassName}
      data-test-name="ContinueToButton"
      data-test-state={type}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon
        className={iconClassName}
        type={type === "next" ? "continue-to-next" : "continue-to-previous"}
      />
    </button>
  );
}
