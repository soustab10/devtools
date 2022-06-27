export default function tryToPositionRange(range: Range): boolean {
  const domSelection = window.getSelection();
  if (domSelection === null || !domSelection.isCollapsed) {
    return false;
  }
  const anchorNode = domSelection.anchorNode;
  const startOffset = 0;
  const endOffset = domSelection.anchorOffset;
  try {
    if (anchorNode) {
      range.setStart(anchorNode, startOffset);
      range.setEnd(anchorNode, endOffset);
    }
  } catch (error) {
    return false;
  }

  return true;
}
