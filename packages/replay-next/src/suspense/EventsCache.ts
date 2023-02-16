import { PointRange } from "@replayio/protocol";
import {
  EventHandlerType,
  ExecutionPoint,
  Frame,
  Location,
  PauseData,
  PauseId,
  Value as ProtocolValue,
  Object as RecordReplayObject,
} from "@replayio/protocol";

import { AnalysisInput, SendCommand, getFunctionBody } from "protocol/evaluation-utils";
import { ReplayClientInterface } from "shared/client/types";

import { STANDARD_EVENT_CATEGORIES } from "../constants";
import { createGenericCache } from "./createGenericCache";
import { cachePauseData } from "./PauseCache";

export type Event = {
  count: number;
  label: string;
  type: EventHandlerType;
};

export type EventCategory = {
  category: string;
  events: Event[];
};

export type EventLog = {
  data: {
    frames: Frame[];
    objects: RecordReplayObject[];
  };
  location: Location[];
  pauseId: PauseId;
  point: ExecutionPoint;
  time: number;
  type: "EventLog";
  values: ProtocolValue[];
};

export const {
  getStatus: getEventCategoryCountsStatus,
  getValueSuspense: getEventCategoryCountsSuspense,
  getValueAsync: getEventCategoryCountsAsync,
  getValueIfCached: getEventCategoryCountsIfCached,
  subscribeToStatus: subscribeToEventCategoryCountsStatus,
} = createGenericCache<
  [client: ReplayClientInterface],
  [range: PointRange | null],
  EventCategory[]
>(
  "getEventCategoryCounts",
  async (range, client) => {
    const allEvents = await client.getEventCountForTypes(
      Object.values(STANDARD_EVENT_CATEGORIES)
        .map(c => c.events.map(e => e.type))
        .flat(),
      range
    );
    return Object.values(STANDARD_EVENT_CATEGORIES).map(category => {
      return {
        ...category,
        events: category.events.map(eventType => ({
          ...eventType,
          count: allEvents[eventType.type],
        })),
      };
    });
  },
  range => (range ? `${range.begin}:${range.end}` : "")
);

// TODO [FE-1257] This would ideally use Holger's new range cache (once it lands)
export const {
  getStatus: getEventTypeEntryPointsStatus,
  getValueSuspense: getEventTypeEntryPointsSuspense,
  getValueAsync: getEventTypeEntryPointsAsync,
  getValueIfCached: getEventTypeEntryPointsIfCached,
  subscribeToStatus: subscribeToEventTypeEntryPointsStatus,
} = createGenericCache<
  [replayClient: ReplayClientInterface],
  [eventType: EventHandlerType, pointRange: PointRange | null],
  EventLog[]
>(
  "CommentsCache: getCommentsGraphQL",
  1,
  async (
    replayClient: ReplayClientInterface,
    eventType: EventHandlerType,
    pointRange: PointRange | null
  ) => {
    const entryPoints = await replayClient.runAnalysis<EventLog>({
      effectful: false,
      eventHandlerEntryPoints: [{ eventType }],
      mapper: getFunctionBody(eventsMapper),
      range: pointRange || undefined,
    });

    // Pre-cache object previews that came back with our new analysis data.
    // This will avoid us having to turn around and request them again when rendering the logs.
    entryPoints.forEach(entryPoint =>
      cachePauseData(replayClient, entryPoint.pauseId, entryPoint.data)
    );

    const eventLogs: EventLog[] = entryPoints.map(entryPoint => ({
      ...entryPoint,
      type: "EventLog",
    }));

    return eventLogs;
  },
  (eventType: EventHandlerType, pointRange: PointRange | null) => {
    const rangeString = pointRange ? `${pointRange.begin}-${pointRange.end}` : "-";
    return `${eventType}:${rangeString}`;
  }
);

// Variables in scope in an analysis
declare let sendCommand: SendCommand;
declare let input: AnalysisInput;

export function eventsMapper() {
  const finalData: Required<PauseData> = { frames: [], scopes: [], objects: [] };
  function addPauseData({ frames, scopes, objects }: PauseData) {
    finalData.frames.push(...(frames || []));
    finalData.scopes.push(...(scopes || []));
    finalData.objects.push(...(objects || []));
  }

  const { time, pauseId, point } = input;
  const { frame, data } = sendCommand("Pause.getTopFrame", {});
  addPauseData(data);
  const { frameId, location } = finalData.frames.find(f => f.frameId == frame)!;

  // Retrieve protocol value details on the stack frame's arguments
  const { result } = sendCommand("Pause.evaluateInFrame", {
    frameId,
    expression: "[...arguments]",
  });
  const values = [];
  addPauseData(result.data);

  if (result.exception) {
    values.push(result.exception);
  } else {
    // We got back an array of arguments. The protocol requires that we ask for each
    // array index's contents separately, which is annoying.
    const { object } = result.returned!;
    const { result: lengthResult } = sendCommand("Pause.getObjectProperty", {
      object: object!,
      name: "length",
    });
    addPauseData(lengthResult.data);
    const length = lengthResult.returned!.value;
    for (let i = 0; i < length; i++) {
      const { result: elementResult } = sendCommand("Pause.getObjectProperty", {
        object: object!,
        name: i.toString(),
      });
      values.push(elementResult.returned);
      addPauseData(elementResult.data);
    }
  }

  return [
    {
      key: point,
      value: {
        time,
        pauseId,
        point,
        location,
        values,
        data: finalData,
      },
    },
  ];
}
