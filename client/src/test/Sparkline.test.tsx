import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Sparkline } from "@/components/Sparkline";

describe("Sparkline Component", () => {
  it("renders svg when valid data is provided", () => {
    const { container } = render(<Sparkline data={[10, 12, 11, 15]} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const path = container.querySelector("path");
    expect(path).toBeInTheDocument();
  });

  it("renders fallback div when data has fewer than 2 points", () => {
    const { container } = render(<Sparkline data={[10]} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeInTheDocument();
  });
});