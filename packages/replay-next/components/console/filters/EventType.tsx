import { MouseEvent, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

import { Badge, Checkbox } from "design";
import useEventTypeEntryPointsSuspenseStatus from "replay-next/components/console/hooks/useEventTypeEntryPointsSuspenseStatus";
import Icon from "replay-next/components/Icon";
import { ConsoleFiltersContext } from "replay-next/src/contexts/ConsoleFiltersContext";
import useTooltip from "replay-next/src/hooks/useTooltip";
import { STATUS_PENDING, STATUS_REJECTED } from "replay-next/src/suspense/createGenericCache";
import { Event } from "replay-next/src/suspense/EventsCache";

import styles from "./EventType.module.css";

export default function EventType({
  categoryLabel,
  disabled,
  event,
}: {
  categoryLabel: string | null;
  disabled: boolean;
  event: Event;
}) {
  const { eventTypesForDisplay: eventTypes, update } = useContext(ConsoleFiltersContext);

  const status = useEventTypeEntryPointsSuspenseStatus(event.type);

  const { onMouseEnter, onMouseLeave, tooltip } = useTooltip({
    position: "left-of",
    tooltip: "There are too many exceptions. Please focus to a smaller time range and try again.",
  });

  const checked = eventTypes[event.type] === true;
  const toggle = () => {
    update({ eventTypes: { [event.type]: !checked } });
  };

  const stopPropagation = (event: MouseEvent) => {
    event.stopPropagation();
  };

  let showErrorBadge = false;
  let className = styles.EventType;
  switch (status) {
    case STATUS_PENDING:
      className = styles.EventTypePending;
      break;
    case STATUS_REJECTED:
      if (checked) {
        className = styles.EventTypeRejected;
        showErrorBadge = true;
      }
      break;
    default:
      if (disabled) {
        className = styles.EventTypeDisabled;
      }
      break;
  }

  return (
    <label
      className={className}
      data-test-id={`EventTypes-${event.type}`}
      data-test-name="EventTypeToggle"
      onClick={stopPropagation}
    >
      <Checkbox disabled={disabled} checked={checked} onChange={toggle} />
      <span className={styles.Label}>
        {categoryLabel && (
          <>
            <span className={styles.CategoryPrefix}>{categoryLabel}</span>
            <Icon className={styles.ArrowIcon} type="arrow" />
          </>
        )}
        <span>{event.label}</span>
      </span>
      {showErrorBadge ? (
        <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
          <Icon className={styles.ExceptionsErrorIcon} type="warning" />
        </span>
      ) : (
        <Badge label={event.count} />
      )}
      {tooltip}
    </label>
  );
}
