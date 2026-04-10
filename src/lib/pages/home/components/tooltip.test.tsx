import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { Tooltip } from "@/lib/pages/home/components/tooltip";

describe("Tooltip", () => {
  it("renders children inside a tooltip wrapper by default", async () => {
    // Arrange
    const rendered = await render(
      <Provider>
        <Tooltip content="Helpful tip">
          <button type="button">Hover me</button>
        </Tooltip>
      </Provider>,
    );

    // Assert
    await expect
      .element(rendered.getByRole("button", { name: "Hover me" }))
      .toBeInTheDocument();
  });

  it("returns children directly without a tooltip wrapper when disabled", async () => {
    // Arrange
    const rendered = await render(
      <Provider>
        <Tooltip content="Helpful tip" disabled>
          <button type="button">No tooltip</button>
        </Tooltip>
      </Provider>,
    );

    // Assert
    await expect
      .element(rendered.getByRole("button", { name: "No tooltip" }))
      .toBeInTheDocument();
  });
});
