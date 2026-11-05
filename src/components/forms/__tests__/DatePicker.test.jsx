import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DatePicker from '../DatePicker';

/**
 * The calendar is rendered into <body>, not inside the field wrapper.
 *
 * The wrapper sits in toolbars and filter panels that clip their overflow (the
 * bookings toolbar is `overflow-hidden`), and the 20rem calendar hangs off a
 * 7rem input — as a child of the wrapper it was cut in half by that edge, and
 * the clipped rows were unclickable: the month arrows and the last weeks of the
 * month simply did nothing.
 */
describe('DatePicker — the calendar is not clipped by its surroundings', () => {
  it('renders the calendar at body level rather than inside the clipped wrapper', async () => {
    const user = userEvent.setup();
    render(
      <div data-testid="clipped" className="overflow-hidden">
        <DatePicker value="" onChange={() => {}} placeholder="From" />
      </div>
    );

    await user.click(screen.getByPlaceholderText('From'));

    const calendar = await waitFor(() => {
      const el = document.body.querySelector('.react-datepicker');
      expect(el).not.toBeNull();
      return el;
    });
    expect(screen.getByTestId('clipped').contains(calendar)).toBe(false);
    // It is a direct child of the portal wrapper, which carries the theme class.
    expect(calendar.closest('.dashboard-date-picker')).not.toBeNull();
  });

  it('still selects a date and reports it as a calendar date string', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} placeholder="From" />);

    await user.click(screen.getByPlaceholderText('From'));
    const day = await waitFor(() => {
      const cells = [...document.body.querySelectorAll('.react-datepicker__day')];
      const target = cells.find(
        (cell) => cell.textContent === '15' && !cell.className.includes('outside-month'),
      );
      expect(target).toBeTruthy();
      return target;
    });
    await user.click(day);

    expect(onChange).toHaveBeenCalledTimes(1);
    // A calendar date, not an instant: `yyyy-MM-dd`, whatever the host clock.
    expect(onChange.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('keeps the popper mounted out of the wrapper when it is opened by keyboard', async () => {
    render(
      <div data-testid="clipped" className="overflow-hidden">
        <DatePicker value="" onChange={() => {}} placeholder="From" />
      </div>
    );

    const input = screen.getByPlaceholderText('From');
    fireEvent.focus(input);

    await waitFor(() => expect(document.body.querySelector('.react-datepicker')).not.toBeNull());
    expect(screen.getByTestId('clipped').querySelector('.react-datepicker')).toBeNull();
  });
});
