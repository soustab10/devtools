import { getFixture } from "./helpers";
import { parse, getAst } from "../utils/ast";
import { setSource } from "../sources";

describe("parser", () => {
  it("session.js", () => {
    const sessionText = getFixture("session");
    setSource({ id: "original-session.js", text: sessionText, contentType: "text/javascript" });
    const ast = getAst("original-session.js");
    expect(ast).toMatchSnapshot();
  });
});
