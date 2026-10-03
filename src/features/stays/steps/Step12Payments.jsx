import { StaysField, StaysInput, StaysSelect } from "../components/StaysForm";
import { PAYMENT_MODES } from "../config/constants";
import { Footnote, Notice, RadioCards, Subhead } from "./stepBits";

/**
 * STEP 12 — Payments & invoicing: how guests pay (Booking's payment-mode
 * screen) and who the invoice belongs to (invoicing screen).
 *
 * The answers are saved with the listing; actual payment collection and
 * payout details are confirmed during verification (see Finance), so this
 * step is deliberately preference-only for now.
 */
export default function Step12Payments({ property, patch }) {
  const payments = property.payments || { mode: PAYMENT_MODES[0] };
  const invoicing = property.invoicing || { name: "", legalName: "", sameAddress: true };

  const setInvoice = (key) => (event) =>
    patch({ invoicing: { ...invoicing, [key]: event.target.value } });

  return (
    <>
      <Subhead>How can your guests pay for their stay?</Subhead>
      <RadioCards
        name="paymentMode"
        options={PAYMENT_MODES}
        value={payments.mode || PAYMENT_MODES[0]}
        onChange={(value) => patch({ payments: { ...payments, mode: value } })}
        ariaLabel="Payment mode"
      />

      <Notice title="Payment collection is set up during verification">
        Your choice is saved with this listing. TravioGhana confirms online payments and payout
        details with you before the property goes live — keep your Finance settings up to date.
      </Notice>

      <Subhead>Invoicing</Subhead>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StaysField label="Name on the invoice">
          <StaysInput
            value={invoicing.name || ""}
            onChange={setInvoice("name")}
            placeholder="Kwabena Boachie"
          />
        </StaysField>
        <StaysField label="Legal company name" hint="Leave blank if you invoice as an individual">
          <StaysInput
            value={invoicing.legalName || ""}
            onChange={setInvoice("legalName")}
            placeholder="Expedition-Go Tours LTD"
          />
        </StaysField>
        <StaysField label="Invoice address same as the property?">
          <StaysSelect
            options={["Yes", "No"]}
            value={invoicing.sameAddress === false ? "No" : "Yes"}
            onChange={(event) =>
              patch({ invoicing: { ...invoicing, sameAddress: event.target.value === "Yes" } })
            }
          />
        </StaysField>
        {invoicing.sameAddress === false && (
          <StaysField label="Invoice address" hint="Street, city, region" >
            <StaysInput
              value={invoicing.address || ""}
              onChange={setInvoice("address")}
              placeholder="P.O. Box 123, Accra"
            />
          </StaysField>
        )}
      </div>

      <Footnote>
        Invoicing details appear on TravioGhana statements. They never change the price guests
        see.
      </Footnote>
    </>
  );
}
