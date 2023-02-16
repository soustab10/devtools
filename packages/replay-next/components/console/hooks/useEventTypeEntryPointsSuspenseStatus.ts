import { useCallback, useContext, useMemo, useSyncExternalStore } from "react";

import { FocusContext } from "replay-next/src/contexts/FocusContext";
import { CacheRecordStatus, SubscribeCallback } from "replay-next/src/suspense/createGenericCache";
import {
  getEventTypeEntryPointsStatus,
  subscribeToEventTypeEntryPointsStatus,
} from "replay-next/src/suspense/EventsCache";
import { toPointRange } from "shared/utils/time";

export default function useEventTypeEntryPointsSuspenseStatus(
  eventType: string
): CacheRecordStatus | undefined {
  const { rangeForDisplay: focusRange } = useContext(FocusContext);

  const pointRange = useMemo(() => (focusRange ? toPointRange(focusRange) : null), [focusRange]);

  const getStatus = useCallback(
    () => getEventTypeEntryPointsStatus(eventType, pointRange),
    [eventType, pointRange]
  );
  const subscribe = useCallback(
    (callback: SubscribeCallback) =>
      subscribeToEventTypeEntryPointsStatus(callback, eventType, pointRange),
    [eventType, pointRange]
  );

  const status = useSyncExternalStore(subscribe, getStatus);

  return status;
}
