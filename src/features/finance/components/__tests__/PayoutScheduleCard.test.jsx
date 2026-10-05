import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const { updatePayoutSettingsMock } = vi.hoisted(() => ({ updatePayoutSettingsMock: vi.fn() }));

vi.mock('../../api', () => ({
  updatePayoutSettings: updatePayoutSettingsMock,
}));

import { PayoutScheduleEditor, PayoutScheduleSummary } from '../PayoutScheduleCard';

const OPTIONS = [
  { value: 'WEEKLY', shortLabel: 'Weekly', runDays: 'Every Monday', label: 'Every week — paid every Monday', description: 'Weekly payouts.' },
  { value: 'TWICE_MONTHLY', shortLabel: 'Twice a month', runDays: 'The 1st & 15th', label: 'Twice a month — paid on the 1st & 15th', description: 'Twice-monthly payouts.' },
  { value: 'MONTHLY', shortLabel: 'Monthly', runDays: 'The 1st of each month', label: 'Monthly — paid on the 1st', description: 'Monthly payouts.' },
];

const basePlan = {
  autoManaged: true,
  cycle: 'TWICE_MONTHLY',
  scheduleLabel: 'Twice a month — paid on the 1st & 15th',
  scheduleShortLabel: 'Twice a month',
  runDays: 'The 1st and 15th of each month',
  nextRunAt: new Date(2026, 9, 15, 0, 0, 0).toISOString(),
  nextRunPeriodLabel: 'Oct 1–14',
  lastRunAt: new Date(2026, 9, 1, 0, 0, 0).toISOString(),
  effectiveAt: new Date(2026, 8, 1).toISOString(),
  pendingCycle: null,
  pendingEffectiveAt: null,
  defaultCycle: 'TWICE_MONTHLY',
  autoRunsEnabled: true,
  options: OPTIONS,
};

function Harness({ initial }) {
  const [plan, setPlan] = useState(initial);
  return (
    <MemoryRouter>
      <PayoutScheduleEditor plan={plan} available={1240} onSaved={setPlan} />
    </MemoryRouter>
  );
}

// The option cards' accessible names all contain the word "month"/"week", so
// anchor the match at the start (the short label) to pick exactly one.
const radio = (label) => screen.getByRole('radio', { name: new RegExp(`^${label}\\b`, 'i') });

beforeEach(() => {
  updatePayoutSettingsMock.mockReset();
});

describe('PayoutScheduleEditor', () => {
  it('offers all three cadences with explicit anchor days', () => {
    render(<Harness initial={basePlan} />);

    expect(radio('Weekly')).toBeInTheDocument();
    expect(radio('Twice a month')).toBeInTheDocument();
    expect(radio('Monthly')).toBeInTheDocument();
    // The cadence wording must never be the ambiguous "bi-monthly".
    expect(screen.queryByText(/bi-monthly/i)).not.toBeInTheDocument();
  });

  it('marks the active plan selected and keeps save disabled until it changes', async () => {
    render(<Harness initial={basePlan} />);

    expect(radio('Twice a month')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /save schedule/i })).toBeDisabled();

    await userEvent.click(radio('Weekly'));
    expect(screen.getByRole('button', { name: /save schedule/i })).toBeEnabled();
  });

  it('saves the chosen cadence and shows the scheduled switch', async () => {
    const pendingEffectiveAt = new Date(2026, 10, 1).toISOString();
    updatePayoutSettingsMock.mockResolvedValue({
      ...basePlan,
      pendingCycle: 'WEEKLY',
      pendingEffectiveAt,
    });

    render(<Harness initial={basePlan} />);
    await userEvent.click(radio('Weekly'));
    await userEvent.click(screen.getByRole('button', { name: /save schedule/i }));

    await waitFor(() => expect(updatePayoutSettingsMock).toHaveBeenCalledWith('WEEKLY'));
    expect(await screen.findByText(/switching to weekly/i)).toBeInTheDocument();
  });

  it('shows a scheduled switch and can cancel it', async () => {
    const pending = { ...basePlan, pendingCycle: 'MONTHLY', pendingEffectiveAt: new Date(2026, 10, 1).toISOString() };
    updatePayoutSettingsMock.mockResolvedValue({ ...basePlan, pendingCycle: null, pendingEffectiveAt: null });

    render(<Harness initial={pending} />);
    expect(screen.getByText(/switching to monthly/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /cancel change/i }));

    await waitFor(() => expect(updatePayoutSettingsMock).toHaveBeenCalledWith('TWICE_MONTHLY'));
    await waitFor(() => expect(screen.queryByText(/switching to monthly/i)).not.toBeInTheDocument());
  });

  it('surfaces a paused scheduler without hiding the schedule', () => {
    render(<Harness initial={{ ...basePlan, autoRunsEnabled: false }} />);
    expect(screen.getByText(/automatic payouts are temporarily paused/i)).toBeInTheDocument();
    expect(radio('Twice a month')).toHaveAttribute('aria-checked', 'true');
  });

  it('tells a supplier with no payout method that their schedule is on hold', () => {
    render(<Harness initial={{ ...basePlan, hasVerifiedPayoutMethod: false }} />);
    expect(screen.getByText(/need a verified payout method/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /add one now/i })).toHaveAttribute('href', '/finance?tab=methods');
  });

  it('reports a save failure without losing the selection', async () => {
    updatePayoutSettingsMock.mockRejectedValue({ response: { data: { message: 'Nope' } } });

    render(<Harness initial={basePlan} />);
    await userEvent.click(radio('Monthly'));
    await userEvent.click(screen.getByRole('button', { name: /save schedule/i }));

    await waitFor(() => expect(updatePayoutSettingsMock).toHaveBeenCalledWith('MONTHLY'));
    // Still dirty → the button stays enabled so the supplier can retry.
    expect(screen.getByRole('button', { name: /save schedule/i })).toBeEnabled();
  });
});

describe('PayoutScheduleSummary', () => {
  it('shows the plan and the next run', () => {
    render(
      <MemoryRouter>
        <PayoutScheduleSummary plan={basePlan} available={1240} />
      </MemoryRouter>
    );

    expect(screen.getByText('Twice a month — paid on the 1st & 15th')).toBeInTheDocument();
    expect(screen.getByText(/next payout/i)).toBeInTheDocument();
    expect(screen.getByText(/covering oct 1–14/i)).toBeInTheDocument();
    // Editing the cadence lives in Settings; the card is read-only.
    expect(screen.queryByRole('link', { name: /change schedule/i })).not.toBeInTheDocument();
  });

  it('flags a paused scheduler', () => {
    render(
      <MemoryRouter>
        <PayoutScheduleSummary plan={{ ...basePlan, autoRunsEnabled: false }} available={0} />
      </MemoryRouter>
    );
    expect(screen.getByText(/paused/i)).toBeInTheDocument();
  });

  it('prompts for a payout method when the supplier has none', () => {
    render(
      <MemoryRouter>
        <PayoutScheduleSummary plan={{ ...basePlan, hasVerifiedPayoutMethod: false }} available={0} />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /add a payout method to get paid/i })).toHaveAttribute('href', '/finance?tab=methods');
  });

  it('shows no payout-method prompt once a method is verified', () => {
    render(
      <MemoryRouter>
        <PayoutScheduleSummary plan={{ ...basePlan, hasVerifiedPayoutMethod: true }} available={0} />
      </MemoryRouter>
    );
    expect(screen.queryByText(/add a payout method to get paid/i)).not.toBeInTheDocument();
  });

  // Lead time, not grace time. The window opens the day *before* the run and
  // closes when the run fires. The previous fixture opened on the run day and
  // ran on into the next one, which described a window the scheduler had
  // already closed.
  const openRequestWindow = {
    open: true,
    opensAt: new Date(2026, 9, 14).toISOString(),
    closesAt: new Date(2026, 9, 15).toISOString(),
    cycleLabel: 'Oct 1\u201314',
    runDay: new Date(2026, 9, 15).toISOString(),
    source: 'schedule',
  };

  const inFlightRequest = {
    id: 'pr9',
    reference: 'PR-20261005-998363WCYJ',
    amount: 1263.46,
    currency: 'USD',
    status: 'PROCESSING',
    bookingCount: 12,
    autoGenerated: true,
    cycleLabel: 'Sep 28 \u2013 Oct 4',
    createdAt: new Date(2026, 9, 5, 0, 26).toISOString(),
  };

  it('offers an early request while the manual window is open', async () => {
    const onRequestPayout = vi.fn();
    render(
      <MemoryRouter>
        <PayoutScheduleSummary
          plan={basePlan}
          available={1240}
          requestWindow={openRequestWindow}
          canRequestPayout
          onRequestPayout={onRequestPayout}
        />
      </MemoryRouter>
    );

    const btn = screen.getByRole('button', { name: /request payout/i });
    expect(btn).toBeEnabled();
    // Enabled means there is money, so the amount belongs on the button.
    expect(btn).toHaveTextContent('$1,240.00');
    expect(screen.getByText(/early requests open until/i)).toBeInTheDocument();

    await userEvent.click(btn);
    expect(onRequestPayout).toHaveBeenCalledTimes(1);

    // The cadence chooser is behind an explicit control (see "offers the
    // schedule editor on request"), not a second action competing with the
    // request button.
    expect(screen.queryByRole('link', { name: /change schedule/i })).not.toBeInTheDocument();
  });

  it('disables the request outside the window and says when it opens in visible text', () => {
    render(
      <MemoryRouter>
        <PayoutScheduleSummary
          plan={basePlan}
          available={1240}
          requestWindow={{ ...openRequestWindow, open: false }}
          canRequestPayout={false}
          onRequestPayout={() => {}}
          blockedReason="You can request early from 14 Oct 2026."
        />
      </MemoryRouter>
    );

    const btn = screen.getByRole('button', { name: /request payout/i });
    expect(btn).toBeDisabled();
    // The regression this guards: the reason used to live in a `title`, which a
    // disabled button never shows, because it emits no pointer events. A tooltip
    // that cannot appear is worse than none \u2014 it looks like it explains something.
    expect(btn).not.toHaveAttribute('title');
    expect(screen.getByText(/you can request early from 14 oct 2026/i)).toBeVisible();
  });

  it('names the day the window opens, not the run day', () => {
    // The closed-state chip used to print the run date, which is a day *after*
    // the window has already shut \u2014 so it told the supplier to come back too late.
    render(
      <MemoryRouter>
        <PayoutScheduleSummary
          plan={basePlan}
          available={1240}
          requestWindow={{ ...openRequestWindow, open: false }}
          canRequestPayout={false}
          onRequestPayout={() => {}}
        />
      </MemoryRouter>
    );

    const chip = screen.getByText(/early requests open/i);
    expect(chip).toHaveTextContent('Wed 14 Oct');
    expect(chip).not.toHaveTextContent('Thu 15 Oct');
  });

  it('never puts an amount on the button when nothing can be requested', () => {
    render(
      <MemoryRouter>
        <PayoutScheduleSummary
          plan={basePlan}
          available={0}
          requestWindow={openRequestWindow}
          canRequestPayout={false}
          onRequestPayout={() => {}}
          blockedReason="Nothing is eligible to request yet."
        />
      </MemoryRouter>
    );

    const btn = screen.getByRole('button', { name: /request payout/i });
    expect(btn).toBeDisabled();
    // "Request payout \u00b7 $0.00" is the single worst thing this card can say: a
    // promise of money there is none, on the day the supplier expects to be paid.
    expect(btn).not.toHaveTextContent('$0.00');
    expect(btn).not.toHaveAttribute('title');
    expect(screen.getByText(/nothing is eligible to request yet/i)).toBeVisible();
  });

  it('replaces the request button with the request\u2019s progress while it is in flight', () => {
    render(
      <MemoryRouter>
        <PayoutScheduleSummary
          plan={basePlan}
          available={0}
          requestWindow={openRequestWindow}
          canRequestPayout={false}
          onRequestPayout={() => {}}
          inFlightRequest={inFlightRequest}
        />
      </MemoryRouter>
    );

    // No button at all: those bookings have moved to REQUESTED, so there is
    // nothing left to ask for and a button would be a dead end.
    expect(screen.queryByRole('button', { name: /request payout/i })).not.toBeInTheDocument();
    expect(screen.getByText(/in review/i)).toBeInTheDocument();
    expect(screen.getByText('$1,263.46')).toBeInTheDocument();
    expect(screen.getByText('PR-20261005-998363WCYJ')).toBeInTheDocument();
    expect(screen.getByText(/12 bookings/)).toBeInTheDocument();
    // And it must not claim to be accumulating $0.00 while the money is moving.
    expect(screen.queryByText(/\$0\.00 accumulating/)).not.toBeInTheDocument();
  });

  it('tells the supplier who asked for the payout, not just that one exists', () => {
    const { rerender } = render(
      <MemoryRouter>
        <PayoutScheduleSummary
          plan={basePlan}
          available={0}
          inFlightRequest={inFlightRequest}
          onRequestPayout={() => {}}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/generated automatically/i)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <PayoutScheduleSummary
          plan={basePlan}
          available={0}
          inFlightRequest={{ ...inFlightRequest, autoGenerated: false, status: 'APPROVED' }}
          onRequestPayout={() => {}}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/requested by you/i)).toBeInTheDocument();
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
  });

  it('offers the schedule editor on request, and only then', async () => {
    const onManageSchedule = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <PayoutScheduleSummary plan={basePlan} available={1240} />
      </MemoryRouter>
    );
    expect(screen.queryByRole('button', { name: /manage schedule/i })).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <PayoutScheduleSummary plan={basePlan} available={1240} onManageSchedule={onManageSchedule} />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByRole('button', { name: /manage schedule/i }));
    expect(onManageSchedule).toHaveBeenCalledTimes(1);
  });

  it('renders no request button unless the page asks for one', () => {
    // Legacy callers (and older payloads without a window) must be unaffected.
    render(
      <MemoryRouter>
        <PayoutScheduleSummary plan={basePlan} available={1240} />
      </MemoryRouter>
    );
    expect(screen.queryByRole('button', { name: /request payout/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/manual requests open/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /change schedule/i })).not.toBeInTheDocument();
  });
});
