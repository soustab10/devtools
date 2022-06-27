import type { RangeSelection } from "lexical";

export default function getTextUpToAnchor(selection: RangeSelection): string | null {
  const anchor = selection.anchor;
  if (anchor.type !== "text") {
    return null;
  }

  // We should not be attempting to extract mentions out of nodes that are already being used for other core things.
  // This is especially true for token nodes, which can't be mutated at all.
  const anchorNode = anchor.getNode();
  if (!anchorNode.isSimpleText()) {
    return null;
  }

  return anchorNode.getTextContent().slice(0, anchor.offset);
}
