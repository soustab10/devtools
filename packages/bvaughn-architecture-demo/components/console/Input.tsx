import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useContext, useEffect, useRef } from "react";

import Icon from "../Icon";

import { TypeaheadNode } from "./lexical/plugins/typeahead/TypeaheadNode";
import TypeaheadPlugin from "./lexical/plugins/typeahead";
import styles from "./Input.module.css";
import { SearchContext } from "./SearchContext";

const lexicalConfig = {
  namespace: "ConsoleInput",
  nodes: [TypeaheadNode],
  onError: (...args: any[]) => {
    console.error("Lexical::onError", ...args);
  },
  theme: {},
};

export default function Input({ className }: { className: string }) {
  const [_, searchActions] = useContext(SearchContext);
  const containerRef = useRef<HTMLDivElement>(null);

  // TODO Add eager eval foot preview

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "f" && event.metaKey) {
        event.preventDefault();

        searchActions.show();
      }
    };

    const container = containerRef.current!;
    container.addEventListener("keydown", onKeyDown, true);
    return () => {
      container.removeEventListener("keydown", onKeyDown, true);
    };
  }, [searchActions]);

  const onChange = () => {
    // TODO whatever we need to do for "submitting" the content
  };

  return (
    <div className={`${styles.Input} ${className}`}>
      <Icon className={styles.Icon} type="prompt" />

      <LexicalComposer initialConfig={lexicalConfig}>
        <div ref={containerRef} className={styles.LexicalContainer}>
          <PlainTextPlugin
            contentEditable={<ContentEditable className={styles.LexicalContentEditable} />}
            placeholder=""
          />
          <OnChangePlugin onChange={onChange} />
          <HistoryPlugin />
          <TypeaheadPlugin />
          <CustomAutoFocusPlugin />
        </div>
      </LexicalComposer>
    </div>
  );
}

function CustomAutoFocusPlugin() {
  const [editor] = useLexicalComposerContext();
  const [searchState] = useContext(SearchContext);
  const searchStateVisibleRef = useRef(false);

  useEffect(() => {
    if (!searchState.visible && searchStateVisibleRef.current) {
      editor?.focus();
    }

    searchStateVisibleRef.current = searchState.visible;
  }, [editor, searchState.visible]);

  return null;
}
