import type { LexicalEditor } from "lexical";
import { Dispatch, SetStateAction, startTransition, useEffect, useState } from "react";

import { Resolution } from "../types";
import getTypeaheadTextToSearch from "../utils/getTypeaheadTextToSearch";
import tryToPositionRange from "../utils/tryToPositionRange";

export default function useTypeahead(
  editor: LexicalEditor
): [Resolution | null, Dispatch<SetStateAction<Resolution | null>>] {
  const [resolution, setResolution] = useState<Resolution | null>(null);

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
        const isRangePositioned = tryToPositionRange(range, match.index);
        console.log(`%cuseTypeahead() "${token}"`, "color: yellow;");
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
