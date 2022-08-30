import Inspector from "@bvaughn/components/inspector";
import ErrorBoundary from "@bvaughn/components/ErrorBoundary";
import Expandable from "@bvaughn/components/Expandable";
import Loader from "@bvaughn/components/Loader";
import "@bvaughn/pages/variables.css";
import { clientValueToProtocolNamedValue } from "@bvaughn/src/utils/protocol";
import { NamedValue as ProtocolNamedValue } from "@replayio/protocol";
import InspectorContextReduxAdapter from "devtools/client/debugger/src/components/shared/InspectorContextReduxAdapter";
import { ThreadFront } from "protocol/thread";
import { ReactNode, Suspense, useMemo } from "react";

import styles from "./NewObjectInspector.module.css";

// TODO (delete console) Add better types for roots
export default function NewObjectInspector({ roots }: { roots: any[] }) {
  const pause = ThreadFront.currentPause;

  // HACK
  // The new Object Inspector does not consume ValueFronts.
  // It works with the Replay protocol's Value objects directly.
  // At the moment this means that we need to convert the ValueFront back to a protocol Value.
  const children: ReactNode[] | null = useMemo(() => {
    if (pause == null || pause.pauseId == null) {
      return null;
    }

    const children: ReactNode[] = [];

    roots.forEach((root: any, index) => {
      switch (root.type) {
        case "container": {
          // TODO (delete console) root is not a type that clientValueToProtocolNamedValue() was written for
          // We should create a different adapter function for this
          const protocolValues: ProtocolNamedValue[] = root.contents.map(
            clientValueToProtocolNamedValue
          );
          children.push(
            <Expandable
              key={index}
              header={root.name}
              children={protocolValues.map((protocolValue, index) => (
                <Inspector
                  context="default"
                  key={index}
                  pauseId={pause.pauseId!}
                  protocolValue={protocolValue}
                />
              ))}
            />
          );
          break;
        }
        case "value": {
          const protocolValue = clientValueToProtocolNamedValue(root);
          children.push(
            <Inspector
              context="default"
              key={index}
              pauseId={pause.pauseId!}
              protocolValue={protocolValue}
            />
          );
          break;
        }
      }
    });

    return children;
  }, [pause, roots]);

  return (
    <ErrorBoundary>
      <InspectorContextReduxAdapter>
        <div className={`${styles.Popup} preview-popup`}>
          <Suspense fallback={<Loader />}>{children}</Suspense>
        </div>
      </InspectorContextReduxAdapter>
    </ErrorBoundary>
  );
}
