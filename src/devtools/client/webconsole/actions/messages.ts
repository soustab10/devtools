import { IdGenerator } from "devtools/client/webconsole/utils/id-generator";
import { prepareMessage } from "devtools/client/webconsole/utils/messages";
import type { UIThunkAction } from "ui/actions";
import { pointsReceived } from "ui/reducers/timeline";

import {
  Message as InternalMessage,
  messagesAdded,
  messageEvaluationsCleared,
} from "../reducers/messages";

const defaultIdGenerator = new IdGenerator();

// TODO (delete console) Move this state into React state and get rid of Redux state.
// The Redux state is overly complicated for what we need it for now (just terminal expressions).

export function messagesAdd(
  packets: unknown[],
  idGenerator: IdGenerator | null = null
): UIThunkAction {
  return dispatch => {
    if (idGenerator == null) {
      idGenerator = defaultIdGenerator;
    }
    // TODO This really a good type here?
    const messages: InternalMessage[] = packets.map(packet => prepareMessage(packet, idGenerator));
    dispatch(
      pointsReceived(
        messages
          .filter(p => p.executionPoint && p.executionPointTime)
          .map(p => ({ time: p.executionPointTime!, point: p.executionPoint! }))
      )
    );
    dispatch(messagesAdded(messages));
  };
}

export const messagesClearEvaluations = messageEvaluationsCleared;
