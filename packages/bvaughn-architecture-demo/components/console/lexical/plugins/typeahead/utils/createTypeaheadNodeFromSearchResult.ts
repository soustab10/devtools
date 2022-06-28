import { $createTextNode, LexicalEditor } from "lexical";
import { $getSelection, $isRangeSelection } from "lexical";

import getTypeaheadOffset from "./getTypeaheadOffset";

/**
 * From a Typeahead Search Result, replace plain text from search offset and
 * render a newly created TypeaheadNode.
 */
export default function createTypeaheadNodeFromSearchResult(
  editor: LexicalEditor,
  entryText: string,
  token: string
): void {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
      return;
    }
    const anchor = selection.anchor;
    if (anchor.type !== "text") {
      return;
    }
    const anchorNode = anchor.getNode();
    // We should not be attempting to extract mentions out of nodes that are already being used for other core things.
    // This is especially true for token nodes, which can't be mutated at all.
    if (!anchorNode.isSimpleText()) {
      return;
    }
    const selectionOffset = anchor.offset;
    const textContent = anchorNode.getTextContent().slice(0, selectionOffset);
    const characterOffset = token.length;

    // Given a known offset for the mention match, look backward in the
    // text to see if there's a longer match to replace.
    const mentionOffset = getTypeaheadOffset(textContent, entryText, characterOffset);
    const startOffset = selectionOffset - mentionOffset;
    if (startOffset < 0) {
      return;
    }

    let nodeToReplace;
    if (startOffset === 0) {
      [nodeToReplace] = anchorNode.splitText(selectionOffset);
    } else {
      [, nodeToReplace] = anchorNode.splitText(startOffset, selectionOffset);
    }

    // Insert regular TextNodes so that they can be syntax highlighted by the code plugin.
    const textNode = $createTextNode(entryText);
    nodeToReplace.replace(textNode);
    textNode.select();
  });
}
