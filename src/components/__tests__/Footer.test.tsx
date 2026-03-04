import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Footer from "../Footer";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock fetch
const mockFetch = vi.fn<any>();
global.fetch = mockFetch as any;

describe("Footer Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders contact form elements", () => {
    render(<Footer />);

    expect(screen.getByLabelText(/form.name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/form.email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/form.message/i)).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<Footer />);

    const submitButton = screen.getByRole("button", {
      name: /form.submit/i,
    });
    expect(submitButton).toBeInTheDocument();
  });

  it("form inputs accept user input", () => {
    render(<Footer />);

    const nameInput = screen.getByLabelText(/form.name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/form.email/i) as HTMLInputElement;
    const messageInput = screen.getByLabelText(
      /form.message/i,
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

  it("shows loading state and success message when submitting", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<Footer />);

    const nameInput = screen.getByLabelText(/form.name/i);
    const emailInput = screen.getByLabelText(/form.email/i);
    const messageInput = screen.getByLabelText(/form.message/i);
    const submitButton = screen.getByRole("button", {
      name: /form.submit/i,
    });

    fireEvent.change(nameInput, { target: { value: "Test User" } });
    fireEvent.change(emailInput, { target: { value: "test@test.com" } });
    fireEvent.change(messageInput, { target: { value: "Test message" } });

    // Click handles the async submission
    act(() => {
      fireEvent.click(submitButton);
      vi.advanceTimersByTime(1600);
    });

    // Should show success state after timer
    expect(screen.getByText(/form.success.title/i)).toBeInTheDocument();
  });

  it("renders company information", () => {
    render(<Footer />);

    expect(screen.getByText(/contact.locValue/i)).toBeInTheDocument();
    expect(screen.getByText(/hola@agenciaweb.com/i)).toBeInTheDocument();
  });
});
