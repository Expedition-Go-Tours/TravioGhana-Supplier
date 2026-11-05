/**
 * Recommended actions, in the GetYourGuide sense: a short list of things the
 * supplier can change, each tied to a number on this page.
 *
 * Rules, not opinions. Every action states the figure that triggered it, and
 * an action that cannot be computed is omitted rather than guessed.
 */

const WEAK_CONVERSION = 1; // percent
const ENOUGH_VIEWS = 200;
const HIGH_CANCELLATION = 2; // percent

function ga4ByTour(ga4) {
  const rows = ga4?.rows || [];
  return new Map(rows.map((row) => [row.itemId, row]));
}

export function buildRecommendations({ summary, products = [], ga4, cancellation } = {}) {
  const actions = [];
  const views = ga4ByTour(ga4);

  if (ga4 && ga4.enabled === false) {
    actions.push({
      id: "ga4",
      severity: "info",
      title: "Connect Google Analytics",
      detail:
        "Views, add-to-carts and conversion are invisible without it, so the funnel and the conversion column stay blank.",
      to: null,
    });
  }

  if (summary?.bookings && summary.bookings.total === 0) {
    actions.push({
      id: "no-bookings",
      severity: "info",
      title: "No bookings in this period",
      detail: "Check that your dates are open and your price is competitive before changing anything else.",
      to: "/availability",
    });
  }

  if (cancellation?.cancellationRate > HIGH_CANCELLATION) {
    actions.push({
      id: "cancellation-rate",
      severity: "warning",
      title: `Cancellation rate is ${Number(cancellation.cancellationRate).toFixed(1)}%`,
      detail: `Above the 2% standard, across ${cancellation.eligibleBookings} eligible bookings.`,
      to: "/cancellation-rate",
    });
  }

  const weakProduct = products
    .map((product) => {
      const row = views.get(product.tourId);
      const itemViews = row ? Number(row.itemsViewed) || 0 : 0;
      const purchased = row ? Number(row.itemsPurchased) || 0 : 0;
      return {
        ...product,
        itemViews,
        conversion: itemViews ? (purchased / itemViews) * 100 : null,
      };
    })
    .filter((product) => product.itemViews >= ENOUGH_VIEWS && product.conversion != null && product.conversion < WEAK_CONVERSION)
    .sort((a, b) => b.itemViews - a.itemViews)[0];

  if (weakProduct) {
    actions.push({
      id: "weak-conversion",
      severity: "warning",
      title: `“${weakProduct.name}” gets views but few bookings`,
      detail: `${weakProduct.itemViews.toLocaleString("en-US")} views, ${weakProduct.conversion.toFixed(1)}% booked. Start with the first photo, title and price.`,
      to: `/analytics/${weakProduct.tourId}`,
    });
  }

  const unrated = products
    .filter((product) => !product.rating && (product.bookings || 0) >= 3)
    .sort((a, b) => b.bookings - a.bookings)[0];

  if (unrated) {
    actions.push({
      id: "no-reviews",
      severity: "info",
      title: `“${unrated.name}” has bookings but no reviews`,
      detail: `Ask ${unrated.bookings} recent guests for a review; ratings are what travellers scan first.`,
      to: "/reviews",
    });
  }

  return actions.slice(0, 4);
}
