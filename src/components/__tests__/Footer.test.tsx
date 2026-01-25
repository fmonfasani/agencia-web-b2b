import { render } from "@testing-library/react";
import { describe, it, expect, jest } from "@jest/globals";
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import Footer from "../Footer";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock fetch
global.fetch = jest.fn();

describe("Footer Component", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it("renders contact form elements", () => {
    render(<Footer />);

    expect(screen.getByLabelText(/nombre colaborador/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email corporativo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mensaje/i)).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<Footer />);

    const submitButton = screen.getByRole("button", {
      name: /enviar consulta/i,
    });
    expect(submitButton).toBeInTheDocument();
  });

  it("form inputs accept user input", () => {
    render(<Footer />);

    const nameInput = screen.getByLabelText(
      /nombre colaborador/i,
    ) as HTMLInputElement;
    const emailInput = screen.getByLabelText(
      /email corporativo/i,
    ) as HTMLInputElement;
    const messageInput = screen.getByLabelText(
      /mensaje/i,
    ) as HTMLTextAreaElement;

    fireEvent.change(nameInput, { target: { value: "Juan Perez" } });
    fireEvent.change(emailInput, { target: { value: "juan@empresa.com" } });
    fireEvent.change(messageInput, {
      target: { value: "Necesito una web corporativa" },
    });

    expect(nameInput.value).toBe("Juan Perez");
    expect(emailInput.value).toBe("juan@empresa.com");
    expect(messageInput.value).toBe("Necesito una web corporativa");
  });

  it("shows loading state when submitting", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<Footer />);

    const nameInput = screen.getByLabelText(/nombre colaborador/i);
    const emailInput = screen.getByLabelText(/email corporativo/i);
    const messageInput = screen.getByLabelText(/mensaje/i);
    const submitButton = screen.getByRole("button", {
      name: /enviar consulta/i,
    });

    fireEvent.change(nameInput, { target: { value: "Test User" } });
    fireEvent.change(emailInput, { target: { value: "test@test.com" } });
    fireEvent.change(messageInput, { target: { value: "Test message" } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/enviando/i)).toBeInTheDocument();
    });
  });

  it("shows success message on successful submission", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<Footer />);

    const nameInput = screen.getByLabelText(/nombre colaborador/i);
    const emailInput = screen.getByLabelText(/email corporativo/i);
    const messageInput = screen.getByLabelText(/mensaje/i);
    const submitButton = screen.getByRole("button", {
      name: /enviar consulta/i,
    });

    fireEvent.change(nameInput, { target: { value: "Test User" } });
    fireEvent.change(emailInput, { target: { value: "test@test.com" } });
    fireEvent.change(messageInput, { target: { value: "Test message" } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/consulta enviada/i)).toBeInTheDocument();
    });
  });

  it("renders company information", () => {
    render(<Footer />);

    expect(screen.getByText(/buenos aires/i)).toBeInTheDocument();
    expect(screen.getByText(/hola@agenciaweb.com/i)).toBeInTheDocument();
  });
});
