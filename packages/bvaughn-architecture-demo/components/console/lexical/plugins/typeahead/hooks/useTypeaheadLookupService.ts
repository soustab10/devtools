import { PauseContext } from "@bvaughn/src/contexts/PauseContext";
import { getObjectWithPreview } from "@bvaughn/src/suspense/ObjectPreviews";
import { getPauseData } from "@bvaughn/src/suspense/PauseDataCache";
import { suspendInParallel } from "@bvaughn/src/utils/suspense";
import { NamedValue, Object, Scope } from "@replayio/protocol";
import { useContext, useMemo } from "react";
import { ReplayClientContext } from "shared/client/ReplayClientContext";

export default function useTypeaheadLookupService(token: string) {
  const { pauseId } = useContext(PauseContext);
  const client = useContext(ReplayClientContext);
  const pauseData = pauseId ? getPauseData(client, pauseId) : null;

  const results = useMemo<string[] | null>(() => {
    if (!token || !pauseData || !pauseId) {
      return null;
    }

    const lowerCaseToken = token.toLowerCase();
    const objectFetchFunctions: any[] = [];
    const uniqueNames: Set<string> = new Set();

    // Matches should include any scope bindings:
    const topFrame = pauseData.frames?.[0];
    topFrame?.scopeChain?.forEach((scopeId: string) => {
      const scope = pauseData.scopes?.find(scope => scope.scopeId === scopeId);
      if (scope) {
        scope?.bindings?.forEach((namedValue: NamedValue) => {
          uniqueNames.add(namedValue.name);
        });

        // Some objects may need to have their previews fetched, which will suspend.
        const objectId = scope.object;
        if (objectId) {
          objectFetchFunctions.push(() => getObjectWithPreview(client, pauseId, objectId));
        }
      }
    });

    // As well as properties (and getters) for scope objects.
    //
    // Note that Object previews may need to be fetched before we can read them.
    // Fetch them in parallel to avoid serially suspending.
    const objectsWithPreviews = suspendInParallel(...objectFetchFunctions);
    objectsWithPreviews.forEach((object: Object) => {
      const preview = object.preview;
      if (preview) {
        preview.getterValues?.forEach((namedValue: NamedValue) => {
          uniqueNames.add(namedValue.name);
        });
        preview.properties?.forEach((namedValue: NamedValue) => {
          uniqueNames.add(namedValue.name);
        });
      }
    });

    return Array.from(uniqueNames)
      .filter(name => name.toLowerCase().includes(lowerCaseToken))
      .sort((a, b) => a.localeCompare(b));
  }, [client, pauseData, pauseId, token]);

  return results;
}
