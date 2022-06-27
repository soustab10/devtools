import {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  TextNode,
} from "lexical";

import { SerializedTypeaheadNode } from "./types";

function convertTypeaheadElement(domNode: HTMLElement): DOMConversionOutput | null {
  const textContent = domNode.textContent;

  if (textContent !== null) {
    const node = $createTypeaheadNode(textContent);
    return {
      node,
    };
  }

  return null;
}

const mentionStyle = "background-color: rgba(24, 119, 232, 0.2)";

export class TypeaheadNode extends TextNode {
  __mention: string;

  static getType(): string {
    return "mention";
  }

  static clone(node: TypeaheadNode): TypeaheadNode {
    return new TypeaheadNode(node.__mention, node.__text, node.__key);
  }
  static importJSON(serializedNode: SerializedTypeaheadNode): TypeaheadNode {
    const node = $createTypeaheadNode(serializedNode.mentionName);
    node.setTextContent(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  constructor(mentionName: string, text?: string, key?: NodeKey) {
    super(text ?? mentionName, key);
    this.__mention = mentionName;
  }

  exportJSON(): SerializedTypeaheadNode {
    return {
      ...super.exportJSON(),
      mentionName: this.__mention,
      type: "mention",
      version: 1,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    // TODO Use CSS module for this
    dom.style.cssText = mentionStyle;
    dom.className = "mention";
    return dom;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.setAttribute("data-lexical-mention", "true");
    element.textContent = this.__text;
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-lexical-mention")) {
          return null;
        }
        return {
          conversion: convertTypeaheadElement,
          priority: 1,
        };
      },
    };
  }

  isTextEntity(): true {
    return true;
  }
}

export function $createTypeaheadNode(mentionName: string): TypeaheadNode {
  const mentionNode = new TypeaheadNode(mentionName);
  mentionNode.setMode("segmented").toggleDirectionless();
  return mentionNode;
}

export function $isTypeaheadNode(node: LexicalNode | null | undefined): node is TypeaheadNode {
  return node instanceof TypeaheadNode;
}
