/**
 * The payments & invoicing step patches the payment mode and the invoicing
 * details; the invoice address only appears when it differs from the property.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step12Payments from "../Step12Payments";
import { PAYMENT_MODES } from "../../config/constants";

describe("Step12Payments", () => {
  it("reports the payment mode", async () => {
    const user = userEvent.setup();
    const patch = vi.fn();
    render(<Step12Payments property={{}} patch={patch} />);
    await user.click(screen.getByLabelText(PAYMENT_MODES[1]));
    expect(patch).toHaveBeenCalledWith({ payments: { mode: PAYMENT_MODES[1] } });
  });

  it("reveals the invoice address when it differs from the property", () => {
    render(
      <Step12Payments
        property={{ invoicing: { name: "A", legalName: "", sameAddress: false, address: "Accra" } }}
        patch={() => {}}
      />,
    );
    expect(screen.getByDisplayValue("Accra")).toBeTruthy();
  });

  it("hides the invoice address when it matches the property", () => {
    render(
      <Step12Payments
        property={{ invoicing: { name: "A", legalName: "", sameAddress: true, address: "" } }}
        patch={() => {}}
      />,
    );
    expect(screen.queryByLabelText("Invoice address")).toBeNull();
  });
});
