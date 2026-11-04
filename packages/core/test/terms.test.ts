import { describe, expect, it } from "vitest";
import { parse, render } from "../src/index";

const source = `requ 0.2
org "Northfield Trade Supply"
team sales "Trade sales" owner="Sales lead"
term minimum_order "£150 per order"
term payment "30 days on account after approval"
term apply "Apply for a trade account" url="https://northfield.example/pages/trade"
term payment "Net 30 after approval"
`;

describe("terms", () => {
  it("parses terms with values and links; a repeated id replaces the first", () => {
    const { doc, diagnostics } = parse(source);
    const org = doc.diagrams[0];
    expect(diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(org.kind).toBe("org");
    if (org.kind !== "org") return;
    expect(org.terms.map((t) => [t.id, t.label, t.url])).toEqual([
      ["minimum_order", "£150 per order", undefined],
      ["payment", "Net 30 after approval", undefined],
      [
        "apply",
        "Apply for a trade account",
        "https://northfield.example/pages/trade",
      ],
    ]);
  });

  it("keeps 0.1 files valid and warns on unknown versions", () => {
    expect(
      parse('requ 0.1\norg "A"\nteam a "A"').diagnostics.some(
        (d) => d.code === "W006",
      ),
    ).toBe(false);
    expect(
      parse('requ 0.3\norg "A"\nteam a "A"').diagnostics.some(
        (d) => d.code === "W006",
      ),
    ).toBe(true);
  });

  it("rejects terms outside an org diagram and still renders an org with terms", async () => {
    const { diagnostics } = parse('process "P"\nterm a "b"');
    expect(
      diagnostics.some((d) =>
        d.message.includes("Terms belong in an org diagram."),
      ),
    ).toBe(true);
    expect((await render(source)).svg).toContain("<svg");
  });
});
