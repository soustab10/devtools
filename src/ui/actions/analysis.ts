import { AnalysisEntry, Location, TimeStampedPointRange } from "@replayio/protocol";
import { AnalysisParams } from "protocol/analysisManager";
import { ThreadFront } from "protocol/thread";
import { createAnalysis, AnalysisError } from "protocol/thread/analysis";
import { compareNumericStrings } from "protocol/utils";
import {
  analysisCreated,
  analysisErrored,
  analysisPointsReceived,
  analysisPointsRequested,
} from "devtools/client/debugger/src/reducers/breakpoints";
import { getFocusRegion } from "ui/reducers/timeline";
import { UnsafeFocusRegion } from "ui/state/timeline";
import { getLoadedRegions } from "./app";
import { rangeForFocusRegion } from "ui/utils/timeline";
import { formatLogpoint, store } from "./logpoint";

export async function fetchAnalysisPoints(location: Location) {
  await ThreadFront.ensureAllSources();
  const sourceIds = ThreadFront.getCorrespondingSourceIds(location.sourceId);
  const { line, column } = location;
  const locations = sourceIds.map(sourceId => ({ sourceId, line, column }));

  await Promise.all(
    locations.map(({ sourceId }) => ThreadFront.getBreakpointPositionsCompressed(sourceId))
  );

  const params: AnalysisParams = {
    mapper: formatLogpoint({ text: "", condition: "" }),
    effectful: false,
    locations: locations.map(location => ({ location })),
  };

  let timeRange: TimeStampedPointRange | null = null;
  const focusRegion = getFocusRegion(store.getState());

  if (focusRegion) {
    const ufr = focusRegion as UnsafeFocusRegion;
    params.range = {
      begin: ufr.begin.point,
      end: ufr.end.point,
    };

    timeRange = rangeForFocusRegion(focusRegion);
  } else {
    const loadedRegions = getLoadedRegions(store.getState());
    // Per discussion, `loading` is always a 0 or 1-item array
    timeRange = loadedRegions?.loading[0] ?? null;
  }

  let analysis = await createAnalysis(params);
  const { analysisId } = analysis;

  store.dispatch(analysisCreated({ analysisId, location: locations[0], condition: "", timeRange }));

  await Promise.all(locations.map(location => analysis.addLocation(location)));

  store.dispatch(analysisPointsRequested(analysisId));
  const { points, error } = await analysis.findPoints();

  let analysisResults: AnalysisEntry[] = [];

  // The analysis points may have arrived in any order, so we have to sort
  // them after they arrive.
  points.sort((a, b) => compareNumericStrings(a.point, b.point));

  if (error) {
    store.dispatch(
      analysisErrored({
        analysisId,
        error: AnalysisError.TooManyPointsToFind,
        points,
      })
    );

    return;
  }

  store.dispatch(
    analysisPointsReceived({
      analysisId,
      points,
    })
  );
}
