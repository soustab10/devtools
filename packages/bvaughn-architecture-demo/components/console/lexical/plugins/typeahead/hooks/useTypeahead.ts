import type { LexicalEditor } from "lexical";
import { Dispatch, SetStateAction, startTransition, useEffect, useState } from "react";

import { TypeaheadNode } from "../TypeaheadNode";
import { Resolution } from "../types";
import getTypeaheadTextToSearch from "../utils/getTypeaheadTextToSearch";
import tryToPositionRange from "../utils/tryToPositionRange";

export default function useTypeahead(
  editor: LexicalEditor
): [Resolution | null, Dispatch<SetStateAction<Resolution | null>>] {
  const [resolution, setResolution] = useState<Resolution | null>(null);

  useEffect(() => {
    if (!editor.hasNodes([TypeaheadNode])) {
      throw new Error("TypeaheadsPlugin: TypeaheadNode not registered on editor");
    }
  }, [editor]);

  useEffect(() => {
    let activeRange: Range | null = document.createRange();
    let previousText: string | null = null;

    const updateListener = () => {
      const range = activeRange;
      const text = getTypeaheadTextToSearch(editor);

      if (text === previousText || range === null) {
        return;
      }
      previousText = text;

      if (text === null) {
        return;
      }

      const match = /([^\s]+)$/.exec(text);
      if (match) {
        const token = match[0];
        console.log(`useTypeahead() token: "${token}"`);

        const isRangePositioned = tryToPositionRange(range);
        if (isRangePositioned !== null) {
          startTransition(() => setResolution({ range, token }));
          return;
        }
      }

      startTransition(() => setResolution(null));
    };

    const removeUpdateListener = editor.registerUpdateListener(updateListener);

    return () => {
      activeRange = null;
      removeUpdateListener();
    };
  }, [editor]);

  return [resolution, setResolution];
}
