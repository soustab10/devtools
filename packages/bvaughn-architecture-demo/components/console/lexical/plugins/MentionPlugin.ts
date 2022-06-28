import { $createTextNode, LexicalEditor, RangeSelection, TextNode } from "lexical";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import * as React from "react";
import { createPortal } from "react-dom";
import { $createSearchNode, $isSearchNode, SearchNode } from "../nodes/search-node";
import { isHashtagFirst } from "../regex/isHashtag";

type MentionMatch = {
  leadOffset: number;
  matchingString: string;
  replaceableString: string;
};

type Resolution = {
  match: MentionMatch;
  range: Range;
};

const getOffsets = (match: RegExpExecArray): { start: number; end: number } => {
  const hashtagLength = match[2].length + 1;
  const startOffset = match[1].charAt(0) === " " ? match.index + 1 : match.index; // Do this better
  const endOffset = startOffset + hashtagLength;

  return {
    start: startOffset,
    end: endOffset,
  };
};

const transform = (editor: LexicalEditor, match: RegExpExecArray) => {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
      return;
    }

    const anchor = selection.anchor;

    const anchorNode = anchor.getNode();

    const offset = getOffsets(match);

    let nodeToReplace: TextNode;
    if (offset.start === 0) {
      [nodeToReplace] = anchorNode.splitText(offset.end);
    } else {
      [, nodeToReplace] = anchorNode.splitText(offset.start, offset.end);
    }

    const searchNode = $createSearchNode("@" + match[2], "Mention");
    nodeToReplace.replace(searchNode);
  });
};

const evaluate = (editor: LexicalEditor) => {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
      return;
    }

    const anchor = selection.anchor;
    const anchorNode = anchor.getNode();

    if ($isSearchNode(anchorNode)) {
      anchorNode.splitText(anchor.offset - 1);
    }
  });
};

const getText = (editor: LexicalEditor) => {
  let text = null;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }
    const anchor = selection.anchor;
    const anchorNode = anchor.getNode();

    text = anchorNode.getTextContent();
  });

  return text;
};

function useMentions(editor: LexicalEditor): JSX.Element {
  const [resolution, setResolution] = useState<Resolution>(null);

  useEffect(() => {
    if (!editor.hasNodes([SearchNode])) {
      throw new Error("MentionsPlugin: SearchNode not registered on editor");
    }
  }, [editor]);

  useEffect(() => {
    let activeRange: Range | null = document.createRange();
    let previousText = null;

    const updateListener = () => {
      const range = activeRange;
      const text = getText(editor);

      if (text === previousText || range === null) {
        return;
      }

      previousText = text;

      if (text === null) {
        return;
      }

      const match = /(^@\b|\s@\b)([a-zA-Z0-9]{1,})/.exec(text);
      if (match) {
        transform(editor, match);
      } else {
        evaluate(editor);
      }
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

  return null;
}

export default function MentionPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  return useMentions(editor);
}
