import "jest-dom/extend-expect";
import { mount, html } from "..";
import { of } from "@hullo/core/of";

it("prop static", () => {
  const root = document.createElement("root");
  const end = mount(root, html.div({ props: { id: of(["test"]) } }));
  const div = root.querySelector("div")!;
  expect(div).not.toBeUndefined();
  expect(div.id).toBe("test");
  end();
});
