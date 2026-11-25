import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTeamRole } from "@/hooks/useTeamRole";
import StaysSurface from "../components/StaysSurface";
import StaysPageHeader from "../components/StaysPageHeader";
import AvailabilitySectionTabs from "../components/availability/AvailabilitySectionTabs";
import CalendarSection from "../components/availability/CalendarSection";
import OpenCloseSection from "../components/availability/OpenCloseSection";
import CopyRatesSection from "../components/availability/CopyRatesSection";
import RestrictionRulesSection from "../components/availability/RestrictionRulesSection";
import RatePlansSection from "../components/availability/RatePlansSection";
import ValueAddsSection from "../components/availability/ValueAddsSection";
import PricingPerGuestSection from "../components/availability/PricingPerGuestSection";
import ChildRatesSection from "../components/availability/ChildRatesSection";
import { usePropertyContext } from "../hooks/usePropertyContext";
import {
  AVAILABILITY_SECTIONS,
  DEFAULT_AVAILABILITY_SECTION,
  availabilitySection,
} from "../config/availabilitySections";

/**
 * Availability workspace — one route, eight sections.
 *
 * `/stays/availability` is the calendar; `?section=open-close` (and the other
 * six ids) render the range tools in place. The section list is the same one
 * the sidebar and search palette use, so the three navigation surfaces cannot
 * drift. Rate plans is hidden from members without `stays.rates`.
 */
const SECTION_COMPONENTS = {
  calendar: CalendarSection,
  "open-close": OpenCloseSection,
  "copy-rates": CopyRatesSection,
  restrictions: RestrictionRulesSection,
  "rate-plans": RatePlansSection,
  "value-adds": ValueAddsSection,
  "guest-pricing": PricingPerGuestSection,
  "child-rates": ChildRatesSection,
};

export default function StaysAvailabilityPage() {
  const [searchParams] = useSearchParams();
  const { hasPermission } = useTeamRole();
  const { property } = usePropertyContext();

  const requested = searchParams.get("section") || DEFAULT_AVAILABILITY_SECTION;

  const allowedSections = useMemo(
    () =>
      AVAILABILITY_SECTIONS.filter(
        (section) => !section.permission || hasPermission(section.permission),
      ),
    [hasPermission],
  );

  const activeSection = allowedSections.some((section) => section.id === requested)
    ? availabilitySection(requested)
    : availabilitySection(DEFAULT_AVAILABILITY_SECTION);

  const Section = SECTION_COMPONENTS[activeSection.id] || CalendarSection;

  return (
    <StaysSurface>
      <StaysPageHeader
        title="Availability"
        subtitle={
          property
            ? `${activeSection.description} · ${property.name}`
            : activeSection.description
        }
      />

      <AvailabilitySectionTabs activeSection={activeSection.id} />

      <Section />
    </StaysSurface>
  );
}
