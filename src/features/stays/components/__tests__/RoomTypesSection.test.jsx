import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RoomTypesSection from "../RoomTypesSection";
import { defaultPlanForRoom } from "../../utils/ratePlans";

const room = {
  id: "r1",
  kind: "Deluxe Room",
  name: "Deluxe King Room",
  count: 2,
  adults: 2,
  children: 0,
  beds: "1 king bed",
  size: 38,
  price: 450,
  weekend: 520,
  bathroom: "Private",
  meal: "Breakfast included",
};

function renderSection({ rooms = [], ratePlans = [], onChange = vi.fn(), ...props } = {}) {
  render(
    <RoomTypesSection
      rooms={rooms}
      ratePlans={ratePlans}
      currency="GHS"
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange };
}

describe("RoomTypesSection", () => {
  it("explains the empty state and starts the first room", async () => {
    renderSection();

    expect(screen.getByText("No room types yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add your first room type" })).toBeTruthy();
  });

  it("adds a room and auto-creates its default rate plan", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSection();

    await user.click(screen.getByRole("button", { name: "Add your first room type" }));

    await user.clear(screen.getByLabelText("Room type name"));
    await user.type(screen.getByLabelText("Room type name"), "Garden Suite");
    await user.clear(screen.getByLabelText("Number of units"));
    await user.type(screen.getByLabelText("Number of units"), "3");
    await user.clear(screen.getByLabelText("Max guests"));
    await user.type(screen.getByLabelText("Max guests"), "4");
    await user.clear(screen.getByLabelText("Nightly price (GHS)"));
    await user.type(screen.getByLabelText("Nightly price (GHS)"), "600");
    await user.clear(screen.getByLabelText("Weekend price (GHS)"));
    await user.type(screen.getByLabelText("Weekend price (GHS)"), "700");

    await user.click(screen.getByRole("button", { name: "Add room type" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0];
    expect(next.rooms).toHaveLength(1);
    expect(next.rooms[0]).toMatchObject({
      name: "Garden Suite",
      count: 3,
      adults: 4,
      price: 600,
      weekend: 700,
      meal: "Room only",
    });
    expect(next.ratePlans).toHaveLength(1);
    expect(next.ratePlans[0]).toMatchObject({
      roomId: next.rooms[0].id,
      price: 600,
      weekend: 700,
      baseGuests: 4,
    });
  });

  it("edits a room and updates its default rate plan", async () => {
    const user = userEvent.setup();
    const plan = defaultPlanForRoom(room);
    const { onChange } = renderSection({ rooms: [room], ratePlans: [plan] });

    await user.click(screen.getByRole("button", { name: "Edit Deluxe King Room" }));
    await user.clear(screen.getByLabelText("Nightly price (GHS)"));
    await user.type(screen.getByLabelText("Nightly price (GHS)"), "500");
    await user.click(screen.getByRole("button", { name: "Save room type" }));

    const next = onChange.mock.calls[0][0];
    expect(next.rooms[0]).toMatchObject({ id: "r1", name: "Deluxe King Room", price: 500 });
    expect(next.ratePlans[0]).toMatchObject({ roomId: "r1", price: 500, weekend: 520 });
  });

  it("removes a room together with its rate plans", async () => {
    const user = userEvent.setup();
    const plan = defaultPlanForRoom(room);
    const { onChange } = renderSection({ rooms: [room], ratePlans: [plan] });

    await user.click(screen.getByRole("button", { name: "Remove Deluxe King Room" }));

    expect(onChange).toHaveBeenCalledWith({ rooms: [], ratePlans: [] });
  });

  it("blocks a room with no name or a non-positive price", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSection();

    await user.click(screen.getByRole("button", { name: "Add your first room type" }));
    await user.clear(screen.getByLabelText("Room type name"));
    await user.clear(screen.getByLabelText("Nightly price (GHS)"));
    await user.click(screen.getByRole("button", { name: "Add room type" }));

    expect(screen.getByText("Name this room type")).toBeTruthy();
    expect(screen.getByText("Set a nightly price above zero")).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });
});
