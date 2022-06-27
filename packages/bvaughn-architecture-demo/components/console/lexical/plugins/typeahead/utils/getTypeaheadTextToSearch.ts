import type { LexicalEditor } from "lexical";
import { $getSelection, $isRangeSelection } from "lexical";

import getTextUpToAnchor from "./getTextUpToAnchor";

export default function getTypeaheadTextToSearch(editor: LexicalEditor): string | null {
  let text = null;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }
    text = getTextUpToAnchor(selection);
  });
  return text;
}
