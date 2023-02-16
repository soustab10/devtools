import { useCallback, useContext, useMemo, useSyncExternalStore } from "react";

import { FocusContext } from "replay-next/src/contexts/FocusContext";
import { CacheRecordStatus, SubscribeCallback } from "replay-next/src/suspense/createGenericCache";
import {
  getEventCategoryCountsStatus,
  subscribeToEventCategoryCountsStatus,
} from "replay-next/src/suspense/EventsCache";
import { toPointRange } from "shared/utils/time";

export default function useEventTypeEntryPointsSuspenseStatus(): CacheRecordStatus | undefined {
  const { rangeForDisplay: focusRange } = useContext(FocusContext);

  const pointRange = useMemo(() => (focusRange ? toPointRange(focusRange) : null), [focusRange]);

  const getStatus = useCallback(() => getEventCategoryCountsStatus(pointRange), [pointRange]);
  const subscribe = useCallback(
    (callback: SubscribeCallback) => subscribeToEventCategoryCountsStatus(callback, pointRange),
    [pointRange]
  );

  const status = useSyncExternalStore(subscribe, getStatus);

  return status;
}
