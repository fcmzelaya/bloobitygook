import { describe, it, expect } from "vitest";
import { sanitizeSvg } from "../src/sanitize.js";

describe("sanitizeSvg", () => {
  it("keeps ordinary shape markup intact", () => {
    const clean = '<svg><circle cx="10" cy="10" r="5" fill="#f00"/></svg>';
    const result = sanitizeSvg(clean);
    expect(result).toContain("<circle");
    expect(result).toContain('fill="#f00"');
  });

  it("strips a <script> tag entirely", () => {
    const malicious = '<svg><script>alert(1)</script><circle r="5"/></svg>';
    const result = sanitizeSvg(malicious);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
    expect(result).toContain("<circle");
  });

  it("strips an onload/onclick event-handler attribute", () => {
    const malicious = '<svg onload="alert(1)"><circle r="5" onclick="alert(2)"/></svg>';
    const result = sanitizeSvg(malicious);
    expect(result).not.toContain("onload");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("alert");
  });

  it("strips a <foreignObject> (HTML injection vector)", () => {
    const malicious = '<svg><foreignObject><div onclick="alert(1)">hi</div></foreignObject><rect/></svg>';
    const result = sanitizeSvg(malicious);
    expect(result).not.toContain("foreignObject");
    expect(result).not.toContain("onclick");
  });

  it("strips a style attribute (CSS url() exfiltration vector)", () => {
    const malicious = '<svg><rect style="background:url(https://evil.example/x)"/></svg>';
    const result = sanitizeSvg(malicious);
    expect(result).not.toContain("style=");
    expect(result).not.toContain("evil.example");
  });

  it("strips <use>/<image> (external reference indirection)", () => {
    const malicious = '<svg><use href="https://evil.example/x.svg"/><image href="https://evil.example/x.png"/></svg>';
    const result = sanitizeSvg(malicious);
    expect(result).not.toContain("<use");
    expect(result).not.toContain("<image");
    expect(result).not.toContain("evil.example");
  });

  it("strips a javascript: href", () => {
    const malicious = '<svg><a href="javascript:alert(1)"><circle r="5"/></a></svg>';
    const result = sanitizeSvg(malicious);
    expect(result).not.toContain("javascript:");
  });
});
