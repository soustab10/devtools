import type { LexicalEditor, RangeSelection } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
} from "lexical";
import {
  ReactPortal,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { $createTypeaheadNode, TypeaheadNode } from "./TypeaheadNode";
import styles from "./Typeahead.module.css";

type Resolution = {
  range: Range;
  token: string;
};

// At most, 5 suggestions are shown in the popup.
const SUGGESTION_LIST_LENGTH_LIMIT = 5;

const mentionsCache = new Map();

// TODO Fetch this data from the server
const dummyTypeaheadsData = ["body", "console", "document", "window"];

const dummyLookupService = {
  search(string: string, callback: (results: Array<string> | null) => void): void {
    setTimeout(() => {
      const results = dummyTypeaheadsData.filter(mention =>
        mention.toLowerCase().includes(string.toLowerCase())
      );
      if (results.length === 0) {
        callback(null);
      } else {
        callback(results);
      }
    }, 500);
  },
};

// TODO Connect to Replay protocol
function useTypeaheadLookupService(token: string) {
  const [results, setResults] = useState<Array<string> | null>(null);

  useEffect(() => {
    const cachedResults = mentionsCache.get(token);
    if (cachedResults === null) {
      return;
    } else if (cachedResults !== undefined) {
      setResults(cachedResults);
      return;
    }

    mentionsCache.set(token, null);

    dummyLookupService.search(token, newResults => {
      console.log(
        `%cuseTypeaheadLookupService() -> dummyLookupService.search("${token}") -> newResults:`,
        "color: red;",
        newResults
      );
      mentionsCache.set(token, newResults);
      setResults(newResults);
    });
  }, [token]);

  return results;
}

function TypeaheadItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  result,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  result: string;
}) {
  console.log(`%c<TypeaheadItem result="${result}">`, "color: yellow;");
  return (
    <li
      key={result}
      tabIndex={-1}
      className={isSelected ? styles.TypeaheadListItemSelected : styles.TypeaheadListItem}
      role="option"
      aria-selected={isSelected}
      id={"typeahead-item-" + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {result}
    </li>
  );
}

function Typeahead({
  close,
  editor,
  resolution,
}: {
  close: () => void;
  editor: LexicalEditor;
  resolution: Resolution;
}): JSX.Element | null {
  const divRef = useRef<HTMLDivElement>(null);
  const token = resolution.token;
  const results = useTypeaheadLookupService(token);
  const [selectedIndex, setSelectedIndex] = useState<null | number>(null);
  // console.log(`%c<Typeahead token="${token}" />`, "color: yellow;");

  useEffect(() => {
    const div = divRef.current;
    const rootElement = editor.getRootElement();
    if (results !== null && div !== null && rootElement !== null) {
      const { left, top } = resolution.range.getBoundingClientRect();
      div.style.top = `${top}px`;
      div.style.left = `${left}px`;

      rootElement.setAttribute("aria-controls", "mentions-typeahead");

      return () => {
        rootElement.removeAttribute("aria-controls");
      };
    }
  }, [editor, resolution, results]);

  const applyCurrentSelected = useCallback(() => {
    if (results === null || selectedIndex === null) {
      return;
    }
    const selectedEntry = results[selectedIndex];

    close();

    createTypeaheadNodeFromSearchResult(editor, selectedEntry, token);
  }, [close, token, editor, results, selectedIndex]);

  const updateSelectedIndex = useCallback(
    (index: number) => {
      const rootElem = editor.getRootElement();
      if (rootElem !== null) {
        rootElem.setAttribute("aria-activedescendant", "typeahead-item-" + index);
        setSelectedIndex(index);
      }
    },
    [editor]
  );

  useEffect(() => {
    return () => {
      const rootElem = editor.getRootElement();
      if (rootElem !== null) {
        rootElem.removeAttribute("aria-activedescendant");
      }
    };
  }, [editor]);

  useLayoutEffect(() => {
    if (results === null) {
      setSelectedIndex(null);
    } else if (selectedIndex === null) {
      updateSelectedIndex(0);
    }
  }, [results, selectedIndex, updateSelectedIndex]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_DOWN_COMMAND,
        payload => {
          const event = payload;
          if (results !== null && selectedIndex !== null) {
            if (
              selectedIndex < SUGGESTION_LIST_LENGTH_LIMIT - 1 &&
              selectedIndex !== results.length - 1
            ) {
              updateSelectedIndex(selectedIndex + 1);
            }
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_UP_COMMAND,
        payload => {
          const event = payload;
          if (results !== null && selectedIndex !== null) {
            if (selectedIndex !== 0) {
              updateSelectedIndex(selectedIndex - 1);
            }
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ESCAPE_COMMAND,
        payload => {
          const event = payload;
          if (results === null || selectedIndex === null) {
            return false;
          }
          event.preventDefault();
          event.stopImmediatePropagation();
          close();
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_TAB_COMMAND,
        payload => {
          const event = payload;
          if (results === null || selectedIndex === null) {
            return false;
          }
          event.preventDefault();
          event.stopImmediatePropagation();
          applyCurrentSelected();
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event: KeyboardEvent | null) => {
          if (results === null || selectedIndex === null) {
            return false;
          }
          if (event !== null) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          applyCurrentSelected();
          return true;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [applyCurrentSelected, close, editor, results, selectedIndex, updateSelectedIndex]);

  if (results === null) {
    return null;
  }

  return (
    <div
      aria-label="Suggested mentions"
      data-test-id="ConsoleTypeahead"
      className={styles.Typeahead}
      ref={divRef}
      role="listbox"
    >
      <ul className={styles.TypeaheadList}>
        {results.slice(0, SUGGESTION_LIST_LENGTH_LIMIT).map((result, i) => (
          <TypeaheadItem
            index={i}
            isSelected={i === selectedIndex}
            onClick={() => {
              setSelectedIndex(i);
              applyCurrentSelected();
            }}
            onMouseEnter={() => {
              setSelectedIndex(i);
            }}
            key={result}
            result={result}
          />
        ))}
      </ul>
    </div>
  );
}

function getTextUpToAnchor(selection: RangeSelection): string | null {
  const anchor = selection.anchor;
  if (anchor.type !== "text") {
    return null;
  }
  const anchorNode = anchor.getNode();
  // We should not be attempting to extract mentions out of nodes
  // that are already being used for other core things. This is
  // especially true for token nodes, which can't be mutated at all.
  if (!anchorNode.isSimpleText()) {
    return null;
  }
  const anchorOffset = anchor.offset;
  return anchorNode.getTextContent().slice(0, anchorOffset);
}

function getTypeaheadTextToSearch(editor: LexicalEditor): string | null {
  let text = null;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    console.log("getTypeaheadTextToSearch() selection:", selection);
    if (!$isRangeSelection(selection)) {
      return;
    }
    text = getTextUpToAnchor(selection);
    console.log("getTypeaheadTextToSearch() text:", text);
  });
  return text;
}

/**
 * Walk backwards along user input and forward through entity title to try
 * and replace more of the user's text with entity.
 *
 * E.g. User types "Hello Sarah Smit" and we match "Smit" to "Sarah Smith".
 * Replacing just the match would give us "Hello Sarah Sarah Smith".
 * Instead we find the string "Sarah Smit" and replace all of it.
 */
function getTypeaheadOffset(documentText: string, entryText: string, offset: number): number {
  let triggerOffset = offset;
  for (let ii = triggerOffset; ii <= entryText.length; ii++) {
    if (documentText.substr(-ii) === entryText.substr(0, ii)) {
      triggerOffset = ii;
    }
  }

  return triggerOffset;
}

function tryToPositionRange(range: Range): boolean {
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

/**
 * From a Typeahead Search Result, replace plain text from search offset and
 * render a newly created TypeaheadNode.
 */
function createTypeaheadNodeFromSearchResult(
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
    // We should not be attempting to extract mentions out of nodes
    // that are already being used for other core things. This is
    // especially true for token nodes, which can't be mutated at all.
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

    const mentionNode = $createTypeaheadNode(entryText);
    nodeToReplace.replace(mentionNode);
    mentionNode.select();
  });
}

function useTypeahead(editor: LexicalEditor): ReactPortal | null {
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

  const closeTypeahead = useCallback(() => {
    setResolution(null);
  }, []);

  console.log(`useTypeahead() editor? ${editor !== null} resolution? ${resolution !== null}`);
  return resolution === null || editor === null
    ? null
    : createPortal(
        <Typeahead close={closeTypeahead} resolution={resolution} editor={editor} />,
        document.body
      );
}

export default function TypeaheadPlugin(): ReactPortal | null {
  const [editor] = useLexicalComposerContext();
  return useTypeahead(editor);
}
