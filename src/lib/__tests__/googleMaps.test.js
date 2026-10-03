import { describe, expect, it } from "vitest";
import { isShortGoogleMapsLink, parseGoogleMapsLocation } from "../googleMaps";

describe("parseGoogleMapsLocation", () => {
  it("reads raw coordinate pairs (the mobile 'copy coordinates' output)", () => {
    expect(parseGoogleMapsLocation("5.6037, -0.1870")).toEqual({
      lat: 5.6037,
      lng: -0.187,
      name: "",
    });
    expect(parseGoogleMapsLocation("5.6037 -0.1870")).toEqual({
      lat: 5.6037,
      lng: -0.187,
      name: "",
    });
  });

  it("reads the !3d/!4d place payload and its place name", () => {
    const result = parseGoogleMapsLocation(
      "https://www.google.com/maps/place/Roman+Ridge/@5.61,-0.19,17z/data=!3d5.6037!4d-0.1870",
    );
    expect(result).toEqual({ lat: 5.6037, lng: -0.187, name: "Roman Ridge" });
  });

  it("reads the @ viewport centre when there is no place payload", () => {
    expect(
      parseGoogleMapsLocation("https://www.google.com/maps/@5.6037,-0.1870,15z"),
    ).toEqual({ lat: 5.6037, lng: -0.187, name: "" });
  });

  it("reads the q/query/ll/center/daddr parameter styles", () => {
    expect(parseGoogleMapsLocation("https://maps.google.com/?q=5.6037,-0.1870")).toMatchObject({
      lat: 5.6037,
      lng: -0.187,
    });
    expect(
      parseGoogleMapsLocation("https://www.google.com/maps/search/?api=1&query=5.6037%2C-0.1870"),
    ).toMatchObject({ lat: 5.6037, lng: -0.187 });
    expect(parseGoogleMapsLocation("https://www.google.com/maps?ll=5.6037,-0.1870")).toMatchObject({
      lat: 5.6037,
      lng: -0.187,
    });
    expect(
      parseGoogleMapsLocation("https://www.google.com/maps/dir/?center=5.6037,-0.1870"),
    ).toMatchObject({ lat: 5.6037, lng: -0.187 });
    expect(
      parseGoogleMapsLocation("https://maps.google.com/maps?daddr=5.6037,-0.1870"),
    ).toMatchObject({ lat: 5.6037, lng: -0.187 });
  });

  it("accepts schemeless links and loc:-prefixed coordinates", () => {
    expect(parseGoogleMapsLocation("google.com/maps/@5.6037,-0.1870,15z")).toMatchObject({
      lat: 5.6037,
      lng: -0.187,
    });
    expect(
      parseGoogleMapsLocation("https://maps.google.com/?q=loc:5.6037,-0.1870"),
    ).toMatchObject({ lat: 5.6037, lng: -0.187 });
  });

  it("rejects out-of-range values and inputs without coordinates", () => {
    expect(parseGoogleMapsLocation("120, 0")).toBeNull();
    expect(parseGoogleMapsLocation("5.6037, 200")).toBeNull();
    expect(parseGoogleMapsLocation("Roman Ridge")).toBeNull();
    expect(parseGoogleMapsLocation("https://www.google.com/maps/place/Roman+Ridge")).toBeNull();
    expect(parseGoogleMapsLocation("")).toBeNull();
    expect(parseGoogleMapsLocation(null)).toBeNull();
  });
});

describe("isShortGoogleMapsLink", () => {
  it("flags the short-link hosts the browser cannot expand", () => {
    expect(isShortGoogleMapsLink("https://maps.app.goo.gl/abc123")).toBe(true);
    expect(isShortGoogleMapsLink("https://goo.gl/maps/abc123")).toBe(true);
    expect(isShortGoogleMapsLink("https://g.co/kgs/abc123")).toBe(true);
  });

  it("does not flag full links or raw pairs", () => {
    expect(isShortGoogleMapsLink("https://www.google.com/maps/@5.6,-0.18,15z")).toBe(false);
    expect(isShortGoogleMapsLink("5.6, -0.18")).toBe(false);
  });
});
