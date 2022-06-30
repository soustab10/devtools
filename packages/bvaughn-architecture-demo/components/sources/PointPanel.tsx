import Icon from "@bvaughn/components/Icon";
import { Point, PointsContext } from "@bvaughn/src/contexts/PointsContext";
import { getHitPointsForLocation } from "@bvaughn/src/suspense/PointsCache";
import { Suspense, useContext, useMemo, useState } from "react";
import { ReplayClientContext } from "shared/client/ReplayClientContext";
import Loader from "../Loader";

import styles from "./PointPanel.module.css";

export default function PointPanel({ className, point }: { className: string; point: Point }) {
  const { deletePoint, editPoint } = useContext(PointsContext);

  const [editableContent, setEditableContent] = useState(point.content);

  const isContentValid = useMemo(() => {
    try {
      // Cheap parser/validator.
      new Function(editableContent);
      return true;
    } catch (error) {
      return false;
    }
  }, [editableContent]);

  return (
    <div className={`${styles.Point} ${className}`}>
      <div className={styles.Row}>
        <input
          className={styles.Input}
          onChange={event => setEditableContent(event.currentTarget.value)}
          placeholder="Content..."
          value={editableContent}
        />
        <label className={styles.Label}>
          <input
            checked={point.enableBreaking}
            onChange={event => editPoint(point.id, { enableBreaking: event.currentTarget.checked })}
            type="checkbox"
          />
          break?
        </label>
        <label className={styles.Label}>
          <input
            checked={point.enableLogging}
            onChange={event => editPoint(point.id, { enableLogging: event.currentTarget.checked })}
            type="checkbox"
          />
          log?
        </label>
        <small>
          ({point.location.line}:{point.location.column})
        </small>
        <button className={styles.DeleteButton} onClick={() => deletePoint(point.id)}>
          <Icon className={styles.DeleteButtonIcon} type="delete" />
        </button>
        <button
          className={styles.SaveButton}
          disabled={!isContentValid}
          onClick={() => editPoint(point.id, { content: editableContent })}
        >
          <Icon className={styles.SaveButtonIcon} type="save" />
        </button>
      </div>
      <div className={styles.Row}>
        <Suspense fallback={<Loader />}>
          <HitPoints point={point} />
        </Suspense>
      </div>
    </div>
  );
}

function HitPoints({ point }: { point: Point }) {
  const client = useContext(ReplayClientContext);
  const hitPoints = getHitPointsForLocation(client, point.location);
  return (
    <ul className={styles.HitPointsList}>
      {hitPoints.map(point => (
        <li key={point.point} className={styles.HitPointListItem}>
          {point.time} ms
        </li>
      ))}
    </ul>
  );
}
