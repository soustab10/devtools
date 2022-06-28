import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalTextEntity } from "@lexical/react/useLexicalTextEntity";
import { addClassNamesToElement } from "@lexical/utils";
import jsTokens from "js-tokens";
import type { Token } from "js-tokens";
import {
  $getSelection,
  $isRangeSelection,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
  TextNode,
} from "lexical";
import { useEffect } from "react";

import styles from "./styles.module.css";

function parseCode(code: string): Token[] {
  // Wrap with "[...]" so the expression is valid.
  const tokens: Token[] = Array.from(jsTokens(`[${code}]`));

  // Remove the "[]" wrappers.
  return tokens.slice(1, tokens.length - 1);
}

// try {
//   const text = node.__text;
//   console.log("textNodeTransform()", node, text);
//   const parsed = parseCode(text);
//   const isComplete = parsed.map(({ value }) => value).join("") === text;
//   console.log(isComplete);
//   console.log(JSON.stringify(parsed, null, 2));
// } catch (error) {
//   console.error(error);
// }

export class SyntaxHighlightNode extends TextNode {
  static getType(): string {
    return "highlight";
  }

  static clone(node: SyntaxHighlightNode): SyntaxHighlightNode {
    return new SyntaxHighlightNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }

  _todo(element: HTMLElement): void {
    const textContent = element.textContent || "";
    const parsed = parseCode(textContent);
    const html = parsed
      .map((token: Token) => {
        const span = document.createElement("span");
        span.className = styles[token.type] || "";
        span.textContent = token.value;
        return span.outerHTML;
      })
      .join("");
    console.log("_todo()", textContent, "\n", JSON.stringify(parsed, null, 2), "\nhtml:", html);

    // Update HTML in place? This is probably really expensive.
    element.innerHTML = html;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    const textContent = element.textContent || "";
    const parsed = parseCode(textContent);
    element.className = styles[parsed?.[0]?.type] || "";
    console.log("createDOM()", element);
    // this._todo(element);
    return element;
  }

  updateDOM(prevNode: TextNode, dom: HTMLElement, config: EditorConfig): boolean {
    // this._todo(dom);
    console.log("updateDOM()", dom);
    return super.updateDOM(prevNode, dom, config);
  }

  static importJSON(serializedNode: SerializedTextNode): SyntaxHighlightNode {
    const node = $createSyntaxHighlightNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "highlight",
    };
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  isTextEntity(): boolean {
    return true;
  }

  isSimpleText(): boolean {
    return true;
  }
}

export function $createSyntaxHighlightNode(text = ""): SyntaxHighlightNode {
  return new SyntaxHighlightNode(text);
}

export function $isSyntaxHighlightNode(
  node: LexicalNode | null | undefined
): node is SyntaxHighlightNode {
  return node instanceof SyntaxHighlightNode;
}

function createNode(textNode: TextNode): SyntaxHighlightNode {
  // const textContent = textNode.getTextContent();
  // const parsed = parseCode(textContent);
  // console.log("createNode()", textContent, "\n", JSON.stringify(parsed, null, 2));
  return $createSyntaxHighlightNode(textNode.getTextContent());
}

function getMatch(text: string) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }
  const anchor = selection.anchor;
  if (anchor.type !== "text") {
    return null;
  }
  const anchorNode = anchor.getNode();
  // We should not be attempting to extract mentions out of nodes that are already being used for other core things.
  // This is especially true for token nodes, which can't be mutated at all.
  if (!anchorNode.isSimpleText() || $isSyntaxHighlightNode(anchorNode)) {
    return null;
  }

  const selectionOffset = anchor.offset;
  const textContent = anchorNode.getTextContent().slice(0, selectionOffset);
  console.log("getMatch()", selection, textContent);

  const parsed = parseCode(text);
  const lastNode = parsed.length > 0 ? parsed[parsed.length - 1] : null;
  if (lastNode === null) {
    return null;
  }

  // Don't claim the current token until we know what type it is.
  console.log("getMatch()", text, "\n", JSON.stringify(parsed, null, 2));
  return {
    start: 0,
    end: text.length,
  };
}

export function SyntaxHighlightPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([SyntaxHighlightNode])) {
      throw new Error("SyntaxHighlightPlugin: SyntaxHighlightNode not registered on editor");
    }
  }, [editor]);

  useLexicalTextEntity<SyntaxHighlightNode>(getMatch, SyntaxHighlightNode, createNode);

  return null;
}
