import { describe, expect, it } from "vitest";
import { escapeCsv, escapeHtml, generateCsv, generatePrintHtml } from "../lib/pickupExport";

const booking = {
  travelDate: "2026-10-01T00:00:00.000Z",
  selectedTime: "09:00",
  tourName: "City Tour",
  bookingNumber: "TRG-1",
  customerName: "Ann Boateng",
  customerPhone: "+233240000000",
  travelers: 2,
  status: "CONFIRMED",
  specialRequests: "Wheelchair access",
  pickup: {
    place: "Kempinski Hotel",
    areaName: "East Legon",
    address: {
      name: "Kempinski Hotel",
      address: "12 Akuafo St, East Legon, Accra",
      lat: 5.6037,
      lng: -0.187,
    },
    time: "08:15",
    instructions: "Lobby, blue van",
  },
};

describe("escapeCsv", () => {
  it("neutralises spreadsheet formulas", () => {
    expect(escapeCsv("=HYPERLINK(\"http://evil\")")).toBe("\"'=HYPERLINK(\"\"http://evil\"\")\"");
    expect(escapeCsv("+1+1")).toBe("'+1+1");
    expect(escapeCsv("-2+3")).toBe("'-2+3");
    expect(escapeCsv("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("quotes commas, quotes and newlines", () => {
    expect(escapeCsv("a,b")).toBe("\"a,b\"");
    expect(escapeCsv('He said "hi"')).toBe("\"He said \"\"hi\"\"\"");
    expect(escapeCsv("line\nbreak")).toBe("\"line\nbreak\"");
  });
});

describe("generateCsv", () => {
  it("uses the canonical address and includes zone, landmark and requests", () => {
    const csv = generateCsv([booking]);
    expect(csv).toContain("Pickup Address");
    expect(csv).toContain("12 Akuafo St, East Legon, Accra");
    expect(csv).toContain("East Legon");
    expect(csv).toContain("Kempinski Hotel");
    expect(csv).toContain("Lobby, blue van");
    expect(csv).toContain("Wheelchair access");
    // The legacy place must not replace the street address.
    expect(csv).not.toContain("\"Kempinski Hotel\",East Legon");
  });
});

describe("generatePrintHtml", () => {
  it("escapes customer-controlled values so the print window cannot execute HTML", () => {
    const html = generatePrintHtml(
      [{
        ...booking,
        customerName: "<img src=x onerror=alert(1)>",
        pickup: {
          ...booking.pickup,
          instructions: "<script>alert('xss')</script>",
        },
      }],
      "2026-10-01 to 2026-10-01"
    );

    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).not.toContain("<script>alert('xss')</script>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
  });

  it("marks a truncated export", () => {
    const html = generatePrintHtml([booking], "range", { truncated: true });
    expect(html).toContain("larger than the export cap");
  });
});

describe("escapeHtml", () => {
  it("covers all five characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});
