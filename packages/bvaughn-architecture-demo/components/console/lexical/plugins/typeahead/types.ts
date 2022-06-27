import { SerializedTextNode } from "lexical";
import type { Spread } from "lexical";

export type Resolution = {
  range: Range;
  token: string;
};

export type SerializedTypeaheadNode = Spread<
  {
    mentionName: string;
    type: "mention";
    version: 1;
  },
  SerializedTextNode
>;
