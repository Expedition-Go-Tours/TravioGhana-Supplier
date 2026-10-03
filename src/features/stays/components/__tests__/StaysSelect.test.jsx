/**
 * StaysSelect is the workspace's custom dropdown — the same Radix select the
 * Experience product builder uses. It must keep the native-select-shaped API
 * the call sites rely on: `options`, `value`, and `onChange(event)` where the
 * handler reads `event.target.value`.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaysField, StaysSelect } from "../StaysForm";

function renderSelect(props = {}) {
  const onChange = vi.fn();
  const view = render(
    <StaysSelect options={["Hotel", "Resort"]} value="Hotel" onChange={onChange} {...props} />,
  );
  return { ...view, onChange };
}

describe("StaysSelect — custom workspace dropdown", () => {
  it("renders the current value on a combobox trigger with the menu closed", () => {
    renderSelect();
    expect(screen.getByRole("combobox")).toHaveTextContent("Hotel");
    expect(screen.queryByRole("option", { name: "Resort" })).toBeNull();
  });

  it("opens the custom menu and reports selection through the change event", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect();

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Resort" }));

    expect(onChange).toHaveBeenCalledWith({ target: { value: "Resort" } });
  });

  it("supports { value, label } options", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect({
      options: [
        { value: "prop-1", label: "Akwaaba Coast Hotel" },
        { value: "prop-2", label: "Cape Coast Lodge" },
      ],
      value: "prop-1",
    });

    expect(screen.getByRole("combobox")).toHaveTextContent("Akwaaba Coast Hotel");
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Cape Coast Lodge" }));

    expect(onChange).toHaveBeenCalledWith({ target: { value: "prop-2" } });
  });

  it("shows the placeholder when nothing is selected", () => {
    renderSelect({ value: "", placeholder: "Select a property" });
    expect(screen.getByRole("combobox")).toHaveTextContent("Select a property");
  });

  it("forwards the field id so the StaysField label names the control", () => {
    render(
      <StaysField label="Booking status">
        <StaysSelect options={["Open", "Paused"]} value="Open" onChange={() => {}} />
      </StaysField>,
    );

    expect(screen.getByRole("combobox", { name: "Booking status" })).toBeTruthy();
  });
});
