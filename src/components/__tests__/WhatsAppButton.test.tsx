import { render } from "@testing-library/react";
import { describe, it, expect } from "@jest/globals";
import WhatsAppButton from "../WhatsAppButton";
import { screen } from "@testing-library/dom";

describe("WhatsAppButton Component", () => {
  it("renders the WhatsApp button", () => {
    render(<WhatsAppButton />);

    const button = screen.getByRole("link", { name: /contactanos/i });
    expect(button).toBeInTheDocument();
  });

  it("has correct WhatsApp URL structure", () => {
    render(<WhatsAppButton />);

    const button = screen.getByRole("link", { name: /contactanos/i });
    const href = button.getAttribute("href");

    expect(href).toContain("wa.me");
    expect(href).toContain("text=");
  });

  it("opens in new tab with security attributes", () => {
    render(<WhatsAppButton />);

    const button = screen.getByRole("link", { name: /contactanos/i });

    expect(button).toHaveAttribute("target", "_blank");
    expect(button).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("has proper accessibility label", () => {
    render(<WhatsAppButton />);

    const button = screen.getByRole("link", { name: /chat on whatsapp/i });
    expect(button).toHaveAttribute("aria-label", "Chat on WhatsApp");
  });

  it("button has correct styling classes", () => {
    render(<WhatsAppButton />);

    const button = screen.getByRole("link", { name: /contactanos/i });
    expect(button).toHaveClass("fixed", "bottom-6", "right-6");
  });
});
