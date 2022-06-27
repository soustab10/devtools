import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ReactPortal, useCallback } from "react";
import { createPortal } from "react-dom";

import TypeaheadModal from "./TypeaheadModal";
import useTypeahead from "./hooks/useTypeahead";

// This plug-in is based off of the Lexical Mentions plugin example
// https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/MentionsPlugin.tsx
export default function TypeaheadPlugin(): ReactPortal | null {
  const [editor] = useLexicalComposerContext();
  const [resolution, setResolution] = useTypeahead(editor);

  const closeTypeahead = useCallback(() => {
    setResolution(null);
  }, [setResolution]);

  if (resolution === null || editor === null) {
    return null;
  } else {
    return createPortal(
      <TypeaheadModal close={closeTypeahead} resolution={resolution} editor={editor} />,
      document.body
    );
  }
}
