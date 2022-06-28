import type { SerializedElementNode, SerializedTextNode, Spread } from "lexical";

export type SerializedCodeNode = Spread<
  {
    language: string | null | undefined;
    type: "code";
    version: 1;
  },
  SerializedElementNode
>;

export type SerializedCodeHighlightNode = Spread<
  {
    highlightType: string | null | undefined;
    type: "code-highlight";
    version: 1;
  },
  SerializedTextNode
>;
