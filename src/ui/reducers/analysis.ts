import { createSlice, EntityState, PayloadAction, createEntityAdapter } from "@reduxjs/toolkit";
import {
  Location,
  PointDescription,
  AnalysisEntry,
  TimeStampedPointRange,
} from "@replayio/protocol";
import { AnalysisError } from "protocol/thread/analysis";

import { getLocationKey } from "devtools/client/debugger/src/utils/breakpoint";

export enum AnalysisStatus {
  // Happy path
  Created = "Created",
  LoadingPoints = "LoadingPoints",
  PointsRetrieved = "PointsRetrieved",
  LoadingResults = "LoadingResults",
  Completed = "Completed",

  // We don't have this yet, but we *should*, it's important. For instance, when
  // a user changes their focus region and we're going to rerun this anyways?
  // Cancel it!
  Cancelled = "Cancelled",

  // These errors mean very different things! The max hits for getting points is
  // 10,000, while the max hits for running an analysis is 200!
  ErroredGettingPoints = "ErroredGettingPoints",
  ErroredRunning = "ErroredRunning",
}

export type AnalysisRequest = {
  error: AnalysisError | undefined;
  id: string;
  location: Location;
  condition?: string;
  timeRange: TimeStampedPointRange | null;
  points: PointDescription[] | undefined;
  results: AnalysisEntry[] | undefined;
  status: AnalysisStatus;
};

export type BreakpointAnalysisMapping = {
  locationId: string;
  currentAnalysis: string | null;
  lastSuccessfulAnalysis: string | null;
  allAnalyses: string[];
};

export type LocationAnalysisSummary = {
  data: PointDescription[];
  error: AnalysisError | undefined;
  status: AnalysisStatus;
  condition?: string;
  isCompleted: boolean;
};

const analysesAdapter = createEntityAdapter<AnalysisRequest>();
const mappingsAdapter = createEntityAdapter<BreakpointAnalysisMapping>({
  selectId: entry => entry.locationId,
});

export function initialAnalysisState(): AnalysisState {
  return {
    analyses: analysesAdapter.getInitialState(),
    analysisMappings: mappingsAdapter.getInitialState(),
  };
}

export interface AnalysisState {
  analyses: EntityState<AnalysisRequest>;
  /**
   * Maps between a location string and analysis IDs for that location
   */
  analysisMappings: EntityState<BreakpointAnalysisMapping>;
}

const analysisSlice = createSlice({
  name: "analysis",
  initialState: initialAnalysisState,
  reducers: {
    analysisCreated(
      state,
      action: PayloadAction<{
        analysisId: string;
        location: Location;
        condition?: string;
        timeRange: TimeStampedPointRange | null;
      }>
    ) {
      const { analysisId, location, condition, timeRange } = action.payload;

      analysesAdapter.addOne(state.analyses, {
        error: undefined,
        id: analysisId,
        location,
        condition,
        timeRange,
        points: undefined,
        results: undefined,
        status: AnalysisStatus.Created,
      });

      const locationKey = getLocationKey(location);
      const mapping = state.analysisMappings.entities[locationKey];
      if (mapping) {
        mapping.allAnalyses.push(analysisId);
        mapping.currentAnalysis = analysisId;
      }
    },
    analysisPointsRequested(state, action: PayloadAction<string>) {
      const analysisId = action.payload;
      const analysis = state.analyses.entities[analysisId];
      if (!analysis) {
        return;
      }
      analysis.status = AnalysisStatus.LoadingPoints;

      const locationKey = getLocationKey(analysis.location);
      mappingsAdapter.updateOne(state.analysisMappings, {
        id: locationKey,
        changes: { currentAnalysis: analysisId },
      });
    },
    analysisPointsReceived(
      state,
      action: PayloadAction<{ analysisId: string; points: PointDescription[] }>
    ) {
      const { analysisId, points } = action.payload;
      const analysis = state.analyses.entities[analysisId];
      if (!analysis) {
        return;
      }
      analysis.points = points;
      analysis.status = AnalysisStatus.PointsRetrieved;

      const locationKey = getLocationKey(analysis.location);
      mappingsAdapter.updateOne(state.analysisMappings, {
        id: locationKey,
        changes: { lastSuccessfulAnalysis: analysisId },
      });
    },
    analysisResultsRequested(state, action: PayloadAction<string>) {
      analysesAdapter.updateOne(state.analyses, {
        id: action.payload,
        changes: { status: AnalysisStatus.LoadingResults },
      });
    },
    analysisResultsReceived(
      state,
      action: PayloadAction<{ analysisId: string; results: AnalysisEntry[] }>
    ) {
      const { analysisId, results } = action.payload;
      const analysis = state.analyses.entities[analysisId];
      if (!analysis) {
        return;
      }

      // Preemptively freeze the `results` array to keep Immer from recursively freezing,
      // because we have mutable class instances nested inside (EW!)
      Object.freeze(results);

      analysis.results = results;
      analysis.status = AnalysisStatus.Completed;

      const locationKey = getLocationKey(analysis.location);
      mappingsAdapter.updateOne(state.analysisMappings, {
        id: locationKey,
        changes: { lastSuccessfulAnalysis: analysisId },
      });
    },
    analysisErrored(
      state,
      action: PayloadAction<{
        analysisId: string;
        error: AnalysisError;
        points?: PointDescription[];
        results?: AnalysisEntry[];
      }>
    ) {
      const { analysisId, error, points, results } = action.payload;

      const analysis = state.analyses.entities[analysisId];
      if (!analysis) {
        return;
      }

      const currentStatus = analysis.status;
      const isLoadingPoints = currentStatus === AnalysisStatus.LoadingPoints;
      const isLoadingResults = currentStatus === AnalysisStatus.LoadingResults;
      if (!isLoadingPoints && !isLoadingResults) {
        throw "Invalid state update";
      }

      if (points) {
        Object.freeze(points);
      }

      if (results) {
        Object.freeze(results);
      }

      analysesAdapter.updateOne(state.analyses, {
        id: analysisId,
        changes: {
          status: isLoadingPoints
            ? AnalysisStatus.ErroredGettingPoints
            : AnalysisStatus.ErroredRunning,
          points: isLoadingPoints ? points : analysis.points,
          results: isLoadingResults ? results : analysis.results,
          error,
        },
      });
    },
  },
});

export const {
  analysisCreated,
  analysisErrored,
  analysisPointsReceived,
  analysisPointsRequested,
  analysisResultsReceived,
  analysisResultsRequested,
} = analysisSlice.actions;
export default analysisSlice.reducer;
