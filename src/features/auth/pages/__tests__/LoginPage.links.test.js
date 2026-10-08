import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the supplier login → storefront link contract:
 *  - the dead `/become-a-supplier` route is never referenced (it 404s on the
 *    storefront)
 *  - the sole CTA ("Apply to become a supplier") points at the storefront's
 *    real supplier application page (/supplier/register)
 *  - the "approved/active only" status message is not repeated around the
 *    screen (it was previously shown 3x: image panel, mobile heading, footer)
 */

const LOGIN_PAGE = resolve(process.cwd(), "src", "features", "auth", "pages", "LoginPage.jsx");
const STATUS_PAGE = resolve(process.cwd(), "src", "features", "supplier", "pages", "SupplierStatusPage.jsx");

describe("LoginPage storefront links", () => {
  const source = readFileSync(LOGIN_PAGE, "utf8");

  it("points the apply CTA at the storefront supplier application page", () => {
    expect(source).toContain("https://www.travioghana.com/supplier/register");
  });

  it("never references the dead become-a-supplier route", () => {
    expect(source).not.toContain("become-a-supplier");
  });

  it("does not duplicate the approved/active status message", () => {
    expect(source).not.toContain("Approved & active suppliers only");
    expect(source).not.toContain("Access is limited to approved and active suppliers.");
    expect(source).not.toContain("Create one on Travio Ghana");
  });
});

describe("SupplierStatusPage storefront links", () => {
  const source = readFileSync(STATUS_PAGE, "utf8");

  it("points apply/re-apply CTAs at the storefront supplier application page", () => {
    expect(source).toContain("https://www.travioghana.com/supplier/register");
  });

  it("never references the dead become-a-supplier route", () => {
    expect(source).not.toContain("become-a-supplier");
  });
});