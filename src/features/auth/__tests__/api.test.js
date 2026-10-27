import { describe, expect, it } from "vitest";
import { getLoginErrorMessage } from "../api";

function axiosError(overrides = {}) {
  return { isAxiosError: true, ...overrides };
}

describe("getLoginErrorMessage", () => {
  it("explains an unreachable API instead of leaking axios's 'Network Error'", () => {
    const message = getLoginErrorMessage(axiosError({ message: "Network Error" }));
    expect(message).toBe(
      "Cannot reach the sign-in server. Check your connection and try again."
    );
  });

  it("reports timeouts distinctly", () => {
    const message = getLoginErrorMessage(
      axiosError({ code: "ECONNABORTED", message: "timeout of 30000ms exceeded" })
    );
    expect(message).toBe(
      "The sign-in server took too long to respond. Please try again."
    );
  });

  it("prefers the backend's message for answered requests", () => {
    const message = getLoginErrorMessage(
      axiosError({
        message: "Request failed with status code 401",
        response: { data: { message: "Invalid email or password" } },
      })
    );
    expect(message).toBe("Invalid email or password");
  });

  it("keeps ordinary error messages intact", () => {
    const message = getLoginErrorMessage(new Error("Backend did not return user data."));
    expect(message).toBe("Backend did not return user data.");
  });
});
