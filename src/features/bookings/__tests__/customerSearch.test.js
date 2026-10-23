/**
 * Customer rows for the header search.
 *
 * Two things this must never do: show the same person five times when a search
 * matches five of their bookings, and invent a booking count the endpoint
 * cannot actually give (it returns a page of bookings, not a per-customer
 * total). What it shows instead is true: the email that separates two
 * "Kwames", and the activity a supplier is about to care about.
 */
import { describe, expect, it } from 'vitest';
import {
  groupCustomerResults,
  customerActivityLine,
  customerBookingsPath,
  customerChatPath,
} from '../customerSearch';

const FUTURE = new Date(Date.now() + 10 * 86_400_000).toISOString();
const PAST = new Date(Date.now() - 10 * 86_400_000).toISOString();

const booking = (over = {}) => ({
  id: 'b-1',
  bookingNumber: 'TRG-1',
  customerId: 'cust-1',
  customerName: 'Kwame Mensah',
  customerEmail: 'kwame@example.com',
  tourName: 'Shai Hills Safari',
  travelDate: PAST,
  ...over,
});

describe('groupCustomerResults', () => {
  it('collapses one person’s bookings into one row', () => {
    const rows = groupCustomerResults([
      booking({ id: 'b-1', travelDate: PAST }),
      booking({ id: 'b-2', travelDate: FUTURE, tourName: 'Kakum National Park' }),
      booking({ id: 'b-3', customerId: 'cust-2', customerName: 'Akosua Boateng', customerEmail: 'akosua@example.com' }),
    ]);

    // The same face must not appear twice for one search.
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Kwame Mensah');
    expect(rows[0].bookings).toHaveLength(2);
    expect(rows[1].name).toBe('Akosua Boateng');
  });

  it('keeps email as the disambiguator between identical names', () => {
    const rows = groupCustomerResults([
      booking({ id: 'b-1', customerId: 'cust-1', customerName: 'Kwame', customerEmail: 'kwame.a@example.com' }),
      booking({ id: 'b-2', customerId: 'cust-2', customerName: 'Kwame', customerEmail: 'kwame.b@example.com' }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].subtitle).toContain('kwame.a@example.com');
    expect(rows[1].subtitle).toContain('kwame.b@example.com');
  });

  it('never invents a booking count', () => {
    const [row] = groupCustomerResults([booking(), booking({ id: 'b-2' })]);

    // Two bookings were in the sample; the customer may have twenty. A count
    // would be a claim the endpoint cannot back.
    expect(JSON.stringify(row)).not.toMatch(/\d+ bookings/);
  });

  it('skips rows with no identity at all', () => {
    expect(
      groupCustomerResults([{ id: 'b-9', customerName: '', customerEmail: '', customerId: '' }]),
    ).toEqual([]);
  });
});

describe('customerActivityLine', () => {
  it('leads with the next upcoming trip — that is what a supplier must act on', () => {
    const line = customerActivityLine([
      { travelDate: PAST, tourName: 'Old Tour' },
      { travelDate: FUTURE, tourName: 'Kakum National Park' },
    ]);

    expect(line).toContain('Next:');
    expect(line).toContain('Kakum National Park');
  });

  it('falls back to the most recent past trip', () => {
    const line = customerActivityLine([
      { travelDate: PAST, tourName: 'Old Tour' },
      { travelDate: new Date(Date.now() - 30 * 86_400_000).toISOString(), tourName: 'Older Tour' },
    ]);

    expect(line).toContain('Last:');
    expect(line).toContain('Old Tour');
    expect(line).not.toContain('Older Tour');
  });

  it('is empty when nothing has a date', () => {
    expect(customerActivityLine([{ tourName: 'No date' }])).toBe('');
  });
});

describe('where a customer row goes', () => {
  const customer = { id: 'cust-1', name: 'Kwame Mensah', email: 'kwame@example.com', bookings: [] };

  it('opens their bookings scoped to the customer — not by email', () => {
    // The address shown is the relay, and the server's search matches the real
    // inbox: a `?search=<email>` link would find nothing. The id is exact and
    // two "Kwames" never share a link.
    expect(customerBookingsPath(customer)).toBe('/bookings?customerId=cust-1');
  });

  it('falls back to a name search only when the row has no id', () => {
    expect(customerBookingsPath({ name: 'Kwame Mensah' })).toBe('/bookings?search=Kwame%20Mensah');
  });

  it('opens the conversation as the secondary action', () => {
    expect(customerChatPath(customer)).toBe('/chat?customerId=cust-1');
  });

  it('degrades to the chat list without an id rather than a broken link', () => {
    expect(customerChatPath({ name: 'Kwame' })).toBe('/chat');
  });
});

describe('customerSubtitle', () => {
  it('shows the email and the activity, in that order', () => {
    const [row] = groupCustomerResults([booking({ travelDate: FUTURE })]);

    expect(row.subtitle.indexOf('kwame@example.com')).toBeLessThan(row.subtitle.indexOf('Next:'));
  });
});
