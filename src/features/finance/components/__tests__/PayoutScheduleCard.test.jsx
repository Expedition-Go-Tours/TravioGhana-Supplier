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
  return <PayoutScheduleEditor plan={plan} available={1240} onSaved={setPlan} />;
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
  it('shows the plan, the next run and a change link', () => {
    render(
      <MemoryRouter>
        <PayoutScheduleSummary plan={basePlan} available={1240} />
      </MemoryRouter>
    );

    expect(screen.getByText('Twice a month — paid on the 1st & 15th')).toBeInTheDocument();
    expect(screen.getByText(/next payout/i)).toBeInTheDocument();
    expect(screen.getByText(/covering oct 1–14/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /change schedule/i })).toHaveAttribute('href', '/settings?tab=payouts');
  });

  it('flags a paused scheduler', () => {
    render(
      <MemoryRouter>
        <PayoutScheduleSummary plan={{ ...basePlan, autoRunsEnabled: false }} available={0} />
      </MemoryRouter>
    );
    expect(screen.getByText(/paused/i)).toBeInTheDocument();
  });
});
