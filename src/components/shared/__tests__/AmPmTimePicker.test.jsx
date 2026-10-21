import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import AmPmTimePicker from "../AmPmTimePicker";

describe("AmPmTimePicker", () => {
  it("shows an empty state instead of fabricating 08:00 for the planner", () => {
    const onChange = vi.fn();
    render(<AmPmTimePicker value="" onChange={onChange} allowEmpty emptyLabel="No pickup time set" />);

    expect(screen.getByText("No pickup time set")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Set time" }));
    expect(onChange).toHaveBeenCalledWith("08:00");
  });

  it("clears an existing time and calls onClear when supplied", () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(
      <AmPmTimePicker
        value="09:30"
        onChange={onChange}
        onClear={onClear}
        allowEmpty
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear pickup time" }));
    expect(onClear).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the 12-hour selectors working", () => {
    const onChange = vi.fn();
    render(<AmPmTimePicker value="08:00" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Pickup hour" }));
    const listbox = screen.getByRole("listbox", { name: "Pickup hour" });
    fireEvent.click(within(listbox).getByRole("option", { name: "09" }));
    expect(onChange).toHaveBeenCalledWith("09:00");
  });
});
