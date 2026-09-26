import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PayoutMethodFormSheet from "../PayoutMethodFormSheet";

const GHANA = {
  accountName: "Gideon Kwarteng",
  accountNumber: "1234567890",
  bankName: "Ecobank Ghana",
  branchCode: "200300",
};

const fieldFor = (text) => screen.getByLabelText(new RegExp(`^${text}`, "i"));
/** `queryBy` so a test can assert a field is *absent* without catching the throw. */
const noField = (text) => screen.queryByLabelText(new RegExp(`^${text}`, "i"));

/**
 * Pick a country the way a supplier would: type part of its name, then click it.
 * Matching on "name + ISO code" keeps "India" from also matching
 * "British Indian Ocean Territory".
 */
async function pickCountry(user, name, code) {
  const input = fieldFor("Country of your bank account");
  await user.clear(input);
  await user.type(input, name);
  await user.click(await screen.findByRole("option", { name: `${name} (${code})` }));
}

function renderSheet(props = {}) {
  const onSubmit = vi.fn().mockResolvedValue({});
  const onClose = vi.fn();
  const utils = render(<PayoutMethodFormSheet open onSubmit={onSubmit} onClose={onClose} {...props} />);
  return { ...utils, onSubmit, onClose, user: userEvent.setup() };
}

describe("PayoutMethodFormSheet", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<PayoutMethodFormSheet open={false} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opens on Ghana and asks for the identifiers a Ghanaian bank needs", () => {
    renderSheet();

    expect(fieldFor("Country of your bank account")).toHaveValue("Ghana (GH)");
    expect(fieldFor("Account holder name")).toBeInTheDocument();
    expect(fieldFor("Account number")).toBeInTheDocument();
    expect(fieldFor("Bank name")).toBeInTheDocument();
    expect(fieldFor("Branch code")).toBeInTheDocument();
    // Not on the Ghanaian rail.
    expect(noField("IBAN")).toBeNull();
    expect(noField("Sort code")).toBeNull();
  });

  it("swaps the field set when the country changes to the UK", async () => {
    const { user } = renderSheet();

    await pickCountry(user, "United Kingdom", "GB");

    expect(fieldFor("Sort code")).toBeInTheDocument();
    expect(noField("Branch code")).toBeNull();
    // The IBAN is offered, but not required — a UK supplier knows their sort code.
    expect(fieldFor("IBAN")).toBeInTheDocument();
    expect(fieldFor("IBAN")).not.toBeRequired();
    expect(fieldFor("Sort code")).toBeRequired();
    // IBAN, SWIFT/BIC and bank branch are the three optionals on this rail.
    expect(screen.getAllByText("Optional")).toHaveLength(3);
  });

  it("never marks a required field as optional", () => {
    // Regression: the Ghana spec omitted accountName, so the label said
    // "Optional" on a field the validator then refused to save without.
    renderSheet();

    for (const required of ["Account holder name", "Account number", "Bank name", "Branch code"]) {
      expect(fieldFor(required)).toBeRequired();
    }
    for (const optional of ["Bank branch", "Bank address"]) {
      expect(fieldFor(optional)).not.toBeRequired();
    }
    // Currency is a Radix trigger, so it carries no `required` attribute — check
    // the badge is absent there instead.
    expect(screen.getAllByText("Optional")).toHaveLength(2);
  });

  it("asks a eurozone supplier only for an IBAN", async () => {
    const { user } = renderSheet();

    await pickCountry(user, "Germany", "DE");

    expect(fieldFor("IBAN")).toBeInTheDocument();
    expect(noField("Account number")).toBeNull();
    expect(noField("Bank name")).toBeNull();
  });

  it("relabels branchCode per country so India asks for an IFSC", async () => {
    const { user } = renderSheet();

    await pickCountry(user, "India", "IN");

    expect(fieldFor("IFSC code")).toBeInTheDocument();
  });

  it("defaults the currency to the country and follows a country change", async () => {
    const { user } = renderSheet();

    expect(fieldFor("Currency")).toHaveTextContent("GHS — Ghanaian Cedi");

    await pickCountry(user, "United Kingdom", "GB");
    expect(fieldFor("Currency")).toHaveTextContent("GBP — British Pound");
  });

  it("formats an IBAN as it is typed", async () => {
    const { user } = renderSheet();

    await pickCountry(user, "Germany", "DE");
    await user.type(fieldFor("IBAN"), "de89370400440532013000");

    expect(fieldFor("IBAN")).toHaveValue("DE89 3704 0044 0532 0130 00");
  });

  it("formats a sort code as 12-34-56", async () => {
    const { user } = renderSheet();

    await pickCountry(user, "United Kingdom", "GB");
    await user.type(fieldFor("Sort code"), "123456");

    expect(fieldFor("Sort code")).toHaveValue("12-34-56");
  });

  it("tells the supplier which rail their details will be paid on", async () => {
    const { user } = renderSheet();

    expect(screen.getByText("Local transfer")).toBeInTheDocument();

    await pickCountry(user, "Germany", "DE");
    expect(screen.getByText("SEPA transfer")).toBeInTheDocument();
  });

  it("blocks submission and names the missing country-driven field", async () => {
    const { user, onSubmit } = renderSheet();

    await user.click(screen.getByRole("button", { name: /save payout method/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText("Account name is required")).toBeInTheDocument();
    expect(screen.getByText("Branch code is required for Ghana")).toBeInTheDocument();
  });

  it("sends a stripped, correctly shaped payload for a Ghanaian account", async () => {
    const { user, onSubmit, onClose } = renderSheet();

    await user.type(fieldFor("Account holder name"), GHANA.accountName);
    await user.type(fieldFor("Account number"), GHANA.accountNumber);
    await user.type(fieldFor("Bank name"), GHANA.bankName);
    await user.type(fieldFor("Branch code"), GHANA.branchCode);
    await user.click(screen.getByRole("button", { name: /save payout method/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      type: "BANK_TRANSFER",
      currency: "GHS",
      accountName: "Gideon Kwarteng",
      accountNumber: "1234567890",
      bankName: "Ecobank Ghana",
      branchCode: "200300",
      bankCountry: "GH",
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("sends an IBAN and a BIC when a UK supplier supplies them", async () => {
    const { user, onSubmit } = renderSheet();

    await pickCountry(user, "United Kingdom", "GB");
    await user.type(fieldFor("Account holder name"), "Gideon Kwarteng");
    await user.type(fieldFor("Sort code"), "123456");
    await user.type(fieldFor("Account number"), "87654321");
    await user.type(fieldFor("IBAN"), "GB29NWBK60161331926819");
    await user.type(fieldFor("SWIFT"), "NWBKGB2L");
    await user.click(screen.getByRole("button", { name: /save payout method/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      bankCountry: "GB",
      currency: "GBP",
      sortCode: "123456",
      accountNumber: "87654321",
      iban: "GB29NWBK60161331926819",
      swiftCode: "NWBKGB2L",
    });
  });

  it("only asks for the mobile money fields on that tab", async () => {
    const { user } = renderSheet();

    await user.click(screen.getByRole("button", { name: /mobile money/i }));

    expect(fieldFor("Mobile money provider")).toBeInTheDocument();
    expect(fieldFor("Mobile money number")).toBeInTheDocument();
    expect(fieldFor("Wallet holder name")).toBeInTheDocument();
    expect(noField("Account number")).toBeNull();
  });

  it("offers a free-text provider when the wallet is not one we list", async () => {
    const { user, onSubmit } = renderSheet();

    await user.click(screen.getByRole("button", { name: /mobile money/i }));
    await user.click(screen.getByRole("combobox", { name: /mobile money provider/i }));
    await user.click(await screen.findByRole("option", { name: /another provider/i }));
    await user.type(screen.getByLabelText(/provider name/i), "Chipper Cash");
    await user.type(fieldFor("Mobile money number"), "0244000000");
    await user.type(fieldFor("Wallet holder name"), "Gideon Kwarteng");
    await user.click(screen.getByRole("button", { name: /save payout method/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      type: "MOBILE_MONEY",
      mobileProvider: "Chipper Cash",
      mobileNumber: "0244000000",
      accountName: "Gideon Kwarteng",
    });
  });

  it("only asks for an email on the PayPal tab", async () => {
    const { user, onSubmit } = renderSheet();

    await user.click(screen.getByRole("button", { name: /^paypal/i }));
    expect(fieldFor("PayPal email")).toBeInTheDocument();
    expect(noField("Account number")).toBeNull();

    await user.type(fieldFor("PayPal email"), "supplier@example.com");
    await user.click(screen.getByRole("button", { name: /save payout method/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ type: "PAYPAL", currency: "GHS", paypalEmail: "supplier@example.com" });
  });

  it("rejects a malformed PayPal email on blur", async () => {
    const { user } = renderSheet();

    await user.click(screen.getByRole("button", { name: /^paypal/i }));
    await user.type(fieldFor("PayPal email"), "not-an-email");
    await user.tab();

    expect(await screen.findByText("Invalid PayPal email address")).toBeInTheDocument();
  });

  it("can mark the method as the default", async () => {
    const { user, onSubmit } = renderSheet();

    await user.click(screen.getByRole("button", { name: /^paypal/i }));
    await user.type(fieldFor("PayPal email"), "supplier@example.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /save payout method/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].isDefault).toBe(true);
  });

  it("maps a backend field error back onto the input it belongs to", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      response: { data: { message: "body.paypalEmail: invalid PayPal email address" } },
    });
    const { user } = renderSheet({ onSubmit });

    await user.click(screen.getByRole("button", { name: /^paypal/i }));
    await user.type(fieldFor("PayPal email"), "supplier@example.com");
    await user.click(screen.getByRole("button", { name: /save payout method/i }));

    expect(await screen.findByText("invalid PayPal email address")).toBeInTheDocument();
  });

  it("surfaces an unrecognised server error as a banner", async () => {
    const onSubmit = vi.fn().mockRejectedValue({ response: { data: { message: "Payouts are paused" } } });
    const { user } = renderSheet({ onSubmit });

    await user.click(screen.getByRole("button", { name: /^paypal/i }));
    await user.type(fieldFor("PayPal email"), "supplier@example.com");
    await user.click(screen.getByRole("button", { name: /save payout method/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Payouts are paused");
  });

  it("closes on Escape", async () => {
    const { user, onClose } = renderSheet();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("has a Cancel button in the sheet, next to the form", async () => {
    const { user, onClose } = renderSheet();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the masked tail of the account in the summary", async () => {
    const { user } = renderSheet();

    await user.type(fieldFor("Account number"), "1234567890");
    expect(screen.getByText("•••• 7890")).toBeInTheDocument();
  });

  it("keeps the dialog a full-height sheet on mobile", () => {
    renderSheet();

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("h-full");
    expect(dialog.className).toContain("w-full");
    expect(dialog.className).toContain("sm:max-w-[540px]");
  });
});
