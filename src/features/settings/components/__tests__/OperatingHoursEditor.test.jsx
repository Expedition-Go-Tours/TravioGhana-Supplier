import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OperatingHoursEditor from '../OperatingHoursEditor';
import { DAYS, emptyWeeklyHours } from '../../utils/operatingHours';

function Harness({ initial = emptyWeeklyHours(), errors = {}, onChange }) {
  const [value, setValue] = useState(initial);
  return (
    <OperatingHoursEditor
      value={value}
      onChange={(next) => { setValue(next); onChange?.(next); }}
      errors={errors}
    />
  );
}

const dayRow = (day) => document.querySelector(`[data-day="${day}"]`);

function mondayOpen() {
  return { ...emptyWeeklyHours(), Monday: [{ startTime: '08:00', endTime: '18:00' }] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OperatingHoursEditor', () => {
  it('renders a row for every day with an "Add opening hours" action', () => {
    render(<Harness />);
    for (const day of DAYS) {
      const row = dayRow(day);
      expect(row).not.toBeNull();
      expect(within(row).getByText(day)).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: `Add opening hours for ${day}` })).toBeInTheDocument();
    }
    // Nothing open yet → no bulk actions.
    expect(screen.queryByRole('button', { name: /copy to remaining days/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove all/i })).not.toBeInTheDocument();
  });

  it('opens a day with the default 08:00–18:00 range', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add opening hours for Monday' }));

    expect(onChange).toHaveBeenCalledWith({ ...emptyWeeklyHours(), Monday: [{ startTime: '08:00', endTime: '18:00' }] });
  });

  it('shows the range and bulk actions once a day is open', () => {
    render(<Harness initial={mondayOpen()} />);
    const row = dayRow('Monday');
    expect(within(row).queryByRole('button', { name: /add opening hours/i })).not.toBeInTheDocument();
    // Radix Select triggers expose role="combobox"; the 12-hour values render.
    expect(within(row).getByRole('combobox', { name: 'Monday start time hour' })).toHaveTextContent('08');
    expect(within(row).getByRole('combobox', { name: 'Monday end time hour' })).toHaveTextContent('06'); // 18:00 → 6 PM
    expect(screen.getByRole('button', { name: /copy to remaining days/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove all/i })).toBeInTheDocument();
  });

  it('emits 24-hour times when the AM/PM control is used', async () => {
    const onChange = vi.fn();
    render(<Harness initial={mondayOpen()} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Monday start time PM' }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...emptyWeeklyHours(),
      Monday: [{ startTime: '20:00', endTime: '18:00' }],
    });
  });

  it('converts 12-hour noon/midnight correctly', async () => {
    const onChange = vi.fn();
    const initial = { ...emptyWeeklyHours(), Tuesday: [{ startTime: '12:00', endTime: '18:00' }] };
    render(<Harness initial={initial} onChange={onChange} />);

    // 12:00 is noon (PM) — switching to AM means midnight, i.e. 00:00.
    await userEvent.click(screen.getByRole('button', { name: 'Tuesday start time AM' }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...emptyWeeklyHours(),
      Tuesday: [{ startTime: '00:00', endTime: '18:00' }],
    });
  });

  it('closes a single day', async () => {
    const onChange = vi.fn();
    render(<Harness initial={mondayOpen()} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Close Monday' }));
    expect(onChange).toHaveBeenCalledWith(emptyWeeklyHours());
  });

  it('copies the first open day forward to the remaining days', async () => {
    const onChange = vi.fn();
    render(<Harness initial={mondayOpen()} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /copy to remaining days/i }));

    const next = onChange.mock.calls.at(-1)[0];
    expect(next.Monday).toEqual([{ startTime: '08:00', endTime: '18:00' }]);
    for (const day of DAYS.slice(1)) {
      expect(next[day]).toEqual([{ startTime: '08:00', endTime: '18:00' }]);
    }
  });

  it('removes every day at once', async () => {
    const onChange = vi.fn();
    render(<Harness initial={mondayOpen()} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /remove all/i }));
    expect(onChange).toHaveBeenCalledWith(emptyWeeklyHours());
  });

  it('renders a validation message on the offending day', () => {
    render(<Harness initial={mondayOpen()} errors={{ Monday: 'End time must be after the start time' }} />);
    expect(within(dayRow('Monday')).getByText(/end time must be after the start time/i)).toBeInTheDocument();
  });
});
