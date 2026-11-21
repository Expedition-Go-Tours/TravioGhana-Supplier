/**
 * The auth surface has to behave like one page, not four.
 *
 * These pins are the ones a redesign quietly breaks:
 *  - every auth screen renders inside the shared shell, with the same wordmark;
 *  - a failed sign-in is announced and focused, not just painted red;
 *  - an empty submit marks its fields with `aria-invalid` and moves the caret
 *    to the first one;
 *  - the brand green and the live font are the product's, not a stray emerald
 *    and a dead `DM Sans` reference.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({
  hook: vi.fn(),
  googleOneTap: vi.fn(),
  loginWithGoogleOneTap: vi.fn(),
  getLoginErrorMessage: vi.fn((err) => err?.message || "Sign in failed."),
  requestPasswordReset: vi.fn(),
  resetPasswordWithToken: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useSupplierLogin", () => ({
  useSupplierLogin: auth.hook,
}));

vi.mock("@/features/auth/api", () => ({
  loginWithGoogleOneTap: auth.loginWithGoogleOneTap,
  getLoginErrorMessage: auth.getLoginErrorMessage,
  requestPasswordReset: auth.requestPasswordReset,
  resetPasswordWithToken: auth.resetPasswordWithToken,
}));

// The real provider wants a Google client id and injects a script tag; neither
// is relevant to layout or a11y.
vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }) => children,
  useGoogleOneTapLogin: auth.googleOneTap,
}));

import LoginPage from "@/features/auth/pages/LoginPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import AuthCallback from "@/features/auth/pages/AuthCallback";

const page = (route) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <LoginPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.hook.mockReturnValue({
    completeLoginWithEmail: vi.fn(),
    completeLoginFromToken: vi.fn(),
    loading: false,
    error: "",
    setError: vi.fn(),
  });
});

describe("LoginPage", () => {
  it("renders the shared wordmark and the form heading", () => {
    page("/login");
    expect(screen.getByAltText(/travio ghana/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
  });

  it("announces a failed sign-in and moves focus to it", async () => {
    auth.hook.mockReturnValue({
      completeLoginWithEmail: vi.fn(),
      completeLoginFromToken: vi.fn(),
      loading: false,
      error: "Email or password is incorrect.",
      setError: vi.fn(),
    });

    page("/login");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/email or password is incorrect/i);
    await waitFor(() => expect(alert).toHaveFocus());
  });

  it("marks both fields invalid on an empty submit and focuses the first", async () => {
    const user = userEvent.setup();
    page("/login");

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const email = screen.getByLabelText(/email address/i);
    const password = screen.getByLabelText(/^password$/i);

    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(password.getAttribute("aria-invalid")).toBe("true");
    expect(email.getAttribute("aria-describedby")).toBe("email-error");
    expect(password.getAttribute("aria-describedby")).toBe("password-error");
    expect(email).toHaveFocus();
    expect(auth.hook().completeLoginWithEmail).not.toHaveBeenCalled();
  });

  it("clears a field error as soon as the field is edited", async () => {
    const user = userEvent.setup();
    page("/login");

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByText("Enter your email address.")).toBeTruthy();

    await user.type(screen.getByLabelText(/email address/i), "a");

    expect(screen.queryByText("Enter your email address.")).toBeNull();
    expect(
      screen.getByLabelText(/email address/i).getAttribute("aria-invalid"),
    ).toBeNull();
  });

  it("will not submit a malformed address", async () => {
    const user = userEvent.setup();
    page("/login");

    await user.type(screen.getByLabelText(/email address/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(auth.hook().completeLoginWithEmail).not.toHaveBeenCalled();
  });

  it("gives both inputs and both buttons a visible focus style", () => {
    page("/login");

    const controls = [
      screen.getByLabelText(/email address/i),
      screen.getByLabelText(/^password$/i),
      screen.getByRole("button", { name: "Sign in" }),
      screen.getByRole("button", { name: /sign in with google/i }),
    ];

    for (const control of controls) {
      expect(control.className).toContain("focus-visible:ring");
    }
  });
});

describe("every auth screen shares the shell", () => {
  it("forgot-password renders the wordmark and its heading", () => {
    render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );
    expect(screen.getByAltText(/travio ghana/i)).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Reset your password" }),
    ).toBeTruthy();
  });

  it("reset-password renders the wordmark even for a broken link", () => {
    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );
    expect(screen.getByAltText(/travio ghana/i)).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "This link is incomplete" }),
    ).toBeTruthy();
  });

  it("the OAuth callback renders the wordmark too", () => {
    render(
      <MemoryRouter initialEntries={["/auth/callback"]}>
        <AuthCallback />
      </MemoryRouter>,
    );
    expect(screen.getByAltText(/travio ghana/i)).toBeTruthy();
  });
});

describe("auth source guards", () => {
  const files = [
    "src/features/auth/AuthShell.jsx",
    "src/features/auth/pages/LoginPage.jsx",
    "src/features/auth/pages/ForgotPasswordPage.jsx",
    "src/features/auth/pages/ResetPasswordPage.jsx",
    "src/features/auth/pages/AuthCallback.jsx",
  ];
  const read = (file) => readFileSync(resolve(process.cwd(), file), "utf8");

  // Auth runs its own emerald scale rather than the dashboard's forest
  // `primary-*` tokens, so pin the exact steps. A stray `emerald-500` or a
  // hex literal is how one page drifts off the ramp.
  const APPROVED_GREENS = new Set([
    "emerald-50",
    "emerald-100",
    "emerald-600",
    "emerald-700",
    "emerald-800",
  ]);

  it("uses the approved emerald steps and no other green", () => {
    for (const file of files) {
      const source = read(file);
      for (const green of source.match(/emerald-\d{3}/g) || []) {
        expect(APPROVED_GREENS.has(green), `${file}: ${green}`).toBe(true);
      }
      // The dashboard's forest scale is not the auth accent.
      expect(source, file).not.toMatch(/primary-\d/);
      expect(source, file).not.toMatch(/#044b3b|#033629/i);
    }
  });

  it("never references a font it does not load", () => {
    for (const file of files) {
      expect(read(file), file).not.toContain("DM Sans");
    }
  });

  it("routes every page through one shell", () => {
    const pages = files.filter((file) => file.includes("/pages/"));
    for (const file of pages) {
      expect(read(file), file).toContain("AuthShell");
    }
  });

  it("no longer ships the stock sign-in photograph", () => {
    for (const file of files) {
      expect(read(file), file).not.toContain("supplier_login");
    }
  });
});
