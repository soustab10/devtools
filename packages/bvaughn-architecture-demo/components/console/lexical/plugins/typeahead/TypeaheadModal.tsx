import type { LexicalEditor } from "lexical";
import { mergeRegister } from "@lexical/utils";
import {
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
} from "lexical";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import useTypeaheadLookupService from "./hooks/useTypeaheadLookupService";
import TypeaheadList from "./TypeaheadList";
import styles from "./TypeaheadModal.module.css";
import { Resolution } from "./types";
import createTypeaheadNodeFromSearchResult from "./utils/createTypeaheadNodeFromSearchResult";

export default function TypeaheadModal({
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
            if (selectedIndex !== results.length - 1) {
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

  const onListItemClick = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      applyCurrentSelected();
    },
    [applyCurrentSelected]
  );

  const onListItemHover = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  if (results === null || results.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Suggested mentions"
      data-test-id="ConsoleTypeahead"
      className={styles.TypeaheadModal}
      ref={divRef}
      role="listbox"
    >
      <TypeaheadList
        onItemClick={onListItemClick}
        onItemHover={onListItemHover}
        results={results}
        selectedIndex={selectedIndex}
      />
    </div>
  );
}
