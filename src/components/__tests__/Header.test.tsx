import { render } from "@testing-library/react";
import { describe, it, expect } from "@jest/globals";
import Header from "../Header";

// screen is now imported from @testing-library/dom
import { screen } from "@testing-library/dom";

// Mock framer-motion to avoid animation issues in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("Header Component", () => {
  it("renders the logo and company name", () => {
    render(<Header />);

    const companyName = screen.getByText("Agencia Web");
    expect(companyName).toBeInTheDocument();
  });

  it("logo is clickable and links to home", () => {
    render(<Header />);

    const logoLink = screen.getByRole("link", { name: /agencia web/i });
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("renders navigation items", () => {
    render(<Header />);

    expect(screen.getByText("Servicios")).toBeInTheDocument();
    expect(screen.getByText("Proceso")).toBeInTheDocument();
    expect(screen.getByText("Precios")).toBeInTheDocument();
  });

  it("renders CTA button", () => {
    render(<Header />);

    const ctaButtons = screen.getAllByText("Agendar llamada");
    expect(ctaButtons.length).toBeGreaterThan(0);
  });

  it("mobile menu toggle button is present", () => {
    render(<Header />);

    // Mobile menu button should be present
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
