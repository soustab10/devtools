import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ReactPortal, useCallback, useContext } from "react";
import { createPortal } from "react-dom";

import TypeaheadModal from "./TypeaheadModal";
import useTypeahead from "./hooks/useTypeahead";
import { PauseContext } from "@bvaughn/src/contexts/PauseContext";

// This plug-in is based off of the Lexical Mentions plugin example
// https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/MentionsPlugin.tsx
export default function TypeaheadPlugin(): ReactPortal | null {
  const { pauseId } = useContext(PauseContext);
  const [editor] = useLexicalComposerContext();
  const [resolution, setResolution] = useTypeahead(editor);

  const closeTypeahead = useCallback(() => {
    setResolution(null);
  }, [setResolution]);

  if (editor === null || pauseId === null || resolution === null) {
    return null;
  } else {
    return createPortal(
      <TypeaheadModal close={closeTypeahead} resolution={resolution} editor={editor} />,
      document.body
    );
  }
}
