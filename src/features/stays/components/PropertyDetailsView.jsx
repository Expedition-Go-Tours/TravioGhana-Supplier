import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Banknote,
  Bath,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  DoorOpen,
  Image as ImageIcon,
  Images,
  MapPin,
  Pencil,
  Ruler,
  ScrollText,
  Settings2,
  UserRound,
  Users,
  Utensils,
  X,
} from "@/features/stays/icons";
import { cn } from "@/lib/utils";
import StaysButton from "./StaysButton";
import StaysPill from "./StaysPill";
import { formatMoney } from "../utils/money";
import { roomPeople } from "../utils/rooms";
import { planMetaChips } from "../utils/ratePlans";
import { statusTone } from "../utils/status";
import { staysBuilderStepPath, staysCategoryPath } from "../config/staysSteps";

/**
 * Full read-only property preview.
 *
 * Each section is the read view of a builder step and carries an Edit action
 * that deep-links straight back to that step (`?section=&step=`) or, for the
 * pre-builder category chain, to `/stays/properties/build?draft=<id>`.
 *
 * Rate plans and availability intentionally point at the builder settings
 * steps: those are the values this preview shows. The operational calendar and
 * the live per-room plans are managed on their own pages later.
 */

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function photoUrl(photo) {
  if (typeof photo === "string") return photo;
  return photo?.url || photo?.src || "";
}

function formatIsoDate(value) {
  if (!value) return "";
  const raw = String(value);
  const date = new Date(raw.length === 10 ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function bedSummary(bedroom) {
  const parts = [];
  if (bedroom.doubleBeds) {
    parts.push(`${bedroom.doubleBeds} double ${bedroom.doubleBeds === 1 ? "bed" : "beds"}`);
  }
  if (bedroom.singleBeds) {
    parts.push(`${bedroom.singleBeds} single ${bedroom.singleBeds === 1 ? "bed" : "beds"}`);
  }
  return parts.length ? parts.join(", ") : "No beds listed";
}

function addressLines(property) {
  return [
    property.apartment,
    property.address,
    property.city,
    property.region,
    property.postcode,
    property.country,
  ].filter(Boolean);
}

function mapHref(property) {
  if (property.lat != null && property.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.lat},${property.lng}`)}`;
  }
  const query = property.mapAddress || addressLines(property).join(", ");
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : "";
}

function EditAction({ label, path, canEdit, onEdit }) {
  if (!canEdit || !path || !onEdit) return null;
  return (
    <StaysButton size="small" aria-label={label} onClick={() => onEdit(path)}>
      <Pencil size={14} aria-hidden="true" />
      Edit
    </StaysButton>
  );
}

function PreviewSection({ title, icon: Icon, edit, canEdit, onEdit, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 md:text-base">
          {Icon && <Icon size={18} className="text-slate-400" aria-hidden="true" />}
          {title}
        </h3>
        <EditAction {...edit} canEdit={canEdit} onEdit={onEdit} />
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Fact({ label, value, icon: Icon }) {
  if (!Icon) {
    return (
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-medium leading-snug text-slate-800">
          {value || "—"}
        </dd>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <span
          data-testid="overview-fact-icon"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
        >
          <Icon size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 break-words">{label}</span>
      </dt>
      <dd className="ml-12 mt-1 break-words text-sm font-medium leading-snug text-slate-800">
        {value || "—"}
      </dd>
    </div>
  );
}

function ChipList({ items = [], empty = "None selected." }) {
  const list = asArray(items).filter(Boolean);
  if (list.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function SettingRow({ label, value, edit, canEdit, onEdit }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-3 first:border-t-0">
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="mt-0.5 text-sm text-slate-800">{value || "—"}</dd>
      </div>
      <EditAction {...edit} canEdit={canEdit} onEdit={onEdit} />
    </div>
  );
}

function PhotoLightbox({ photos, index, propertyName, onIndexChange, onClose }) {
  const open = index !== null && Boolean(photos[index]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onIndexChange((index - 1 + photos.length) % photos.length);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onIndexChange((index + 1) % photos.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, index, photos.length, onIndexChange]);

  const previous = () => onIndexChange((index - 1 + photos.length) % photos.length);
  const next = () => onIndexChange((index + 1) % photos.length);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/95" />
        <Dialog.Content className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-4 focus:outline-none md:p-8">
          <Dialog.Title className="sr-only">
            Photos of {propertyName || "the property"}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Use the arrow keys to browse photos, or press Escape to close.
          </Dialog.Description>

          <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close photo viewer"
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={22} />
            </button>
          </Dialog.Close>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={previous}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/80 transition-colors hover:bg-white/10 hover:text-white md:left-6"
              >
                <ChevronLeft size={26} />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/80 transition-colors hover:bg-white/10 hover:text-white md:right-6"
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}

          <div className="relative z-10 flex max-h-full w-full max-w-6xl flex-col items-center gap-4">
            <img
              src={photos[index]}
              alt={`${propertyName || "Property"} photo ${index + 1}`}
              className="max-h-[72vh] w-auto max-w-full rounded-xl object-contain shadow-2xl md:max-h-[78vh]"
            />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                {photos.map((photo, photoIndex) => (
                  <button
                    key={`${photo}-${photoIndex}`}
                    type="button"
                    aria-label={`Show photo ${photoIndex + 1}`}
                    aria-pressed={photoIndex === index}
                    onClick={() => onIndexChange(photoIndex)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      photoIndex === index ? "w-4 bg-white" : "w-1.5 bg-white/30 hover:bg-white/60",
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-white/60">
                {index + 1} / {photos.length}
              </span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Gallery({ property, photos, edit, canEdit, onEdit }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const photoCount = photos.length;
  // 5+ photos get the storefront's hero mosaic; fewer photos use a clean grid
  // so a two-photo listing never shows empty mosaic holes.
  const isMosaic = photoCount >= 5;
  const visiblePhotos = photos.slice(0, 5);

  return (
    <PreviewSection title="Photos" icon={ImageIcon} edit={edit} canEdit={canEdit} onEdit={onEdit}>
      {photoCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
          <ImageIcon size={30} className="text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">No photos uploaded yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Add photos in the builder so guests can picture the stay.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-1.5 overflow-hidden rounded-xl",
            isMosaic
              ? "grid-cols-2 md:grid-cols-4 md:grid-rows-2"
              : photoCount === 1
                ? "grid-cols-1"
                : "grid-cols-2",
          )}
        >
          {visiblePhotos.map((photo, index) => {
            const isMain = isMosaic && index === 0;
            const hasMore = isMosaic && index === 4 && photoCount > 5;
            return (
              <button
                key={`${photo}-${index}`}
                type="button"
                onClick={() => setLightboxIndex(index)}
                aria-label={isMain ? `View all ${photoCount} photos` : `Open photo ${index + 1}`}
                className={cn(
                  "group relative overflow-hidden bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500",
                  isMain
                    ? "col-span-2 aspect-[16/9] md:row-span-2 md:aspect-auto"
                    : photoCount === 3 && index === 0
                      ? "col-span-2 aspect-[16/9]"
                      : photoCount === 1
                        ? "aspect-[16/9]"
                        : "aspect-[4/3]",
                  isMosaic && index > 0 && "md:aspect-[5/4]",
                )}
              >
                <img
                  src={photo}
                  alt=""
                  data-testid={index === 0 ? "preview-main-photo" : undefined}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {isMain && photoCount > 1 && (
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-lg bg-black/55 px-3 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-sm transition-colors group-hover:bg-black/65">
                    <Images size={14} aria-hidden="true" />
                    View all {photoCount} photos
                  </span>
                )}
                {hasMore && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                    +{photoCount - 5} more
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <PhotoLightbox
        photos={photos}
        index={lightboxIndex}
        propertyName={property.name}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </PreviewSection>
  );
}

function RoomCard({ room, plans, currency }) {
  const weekend = Number(room.weekend);
  const price = Number(room.price);
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">{room.name || "Room type"}</h4>
          <p className="text-sm text-slate-500">{room.kind || "Standard Room"}</p>
        </div>
        <p className="text-sm font-semibold text-slate-800">
          {formatMoney(price, currency)}
          <span className="ml-1 text-xs font-normal text-slate-500">/ night</span>
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="Units" value={room.count ?? 1} />
        <Fact label="Sleeps" value={roomPeople(room) || 1} />
        <Fact label="Beds" value={room.beds} />
        <Fact label="Size" value={room.size ? `${room.size} m²` : ""} />
        <Fact label="Bathroom" value={room.bathroom} />
        <Fact label="Meal" value={room.meal} />
        {weekend && weekend !== price && (
          <Fact label="Weekend" value={formatMoney(weekend, currency)} />
        )}
      </dl>

      {asArray(room.amenities).length > 0 && (
        <div className="mt-3">
          <ChipList items={room.amenities} />
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Rate plans
        </p>
        {plans.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">No rate plan configured.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {plans.map((plan) => (
              <div key={plan.id || plan.name} className="rounded-lg bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">
                    {plan.name || "Rate plan"}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {formatMoney(plan.price, currency)}
                    <span className="ml-1 text-xs font-normal text-slate-500">/ night</span>
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {planMetaChips(plan).map((chip) => (
                    <span
                      key={chip}
                      className="rounded-md bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-100"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PropertyDetailsView({
  property,
  onEdit,
  canEdit = true,
}) {
  if (!property) return null;

  const photos = asArray(property.photos).map(photoUrl).filter(Boolean);
  const rooms = asArray(property.rooms);
  const ratePlans = asArray(property.ratePlans);
  const facilities = asArray(property.facilities).filter(Boolean);
  const languages = asArray(property.languages).filter(Boolean);
  const bedrooms = asArray(property.sleeping?.bedrooms);
  const livingRoomBeds = Number(property.sleeping?.livingRoomBeds) || 0;
  const otherSpacesBeds = Number(property.sleeping?.otherSpacesBeds) || 0;
  const hostProfile = property.hostProfile || {};
  const services = property.services || {};
  const settings = property.ratePlanSettings || {};
  const standard = settings.standard || {};
  const child = settings.child || {};
  const nonRefundable = settings.nonRefundable || {};
  const weekly = settings.weekly || {};
  const currency = property.currency || "GHS";
  const nightlyPrice = Number(property.pricePerNight) || Number(rooms[0]?.price) || 0;
  // Match the defaults the builder's "Rate plans" step displays until the
  // supplier edits them.
  const twoGuests = Number(standard.twoGuests) || 29;
  const oneGuest = Number(standard.oneGuest) || 26.1;
  const childFree = child.free ?? true;
  const childMaxAge = child.maxAge ?? 17;
  const nonRefundableDiscount = nonRefundable.discount ?? 10;
  const weeklyDiscount = weekly.discount ?? 15;
  const weeklyMinNights = weekly.minNights ?? 7;
  const address = addressLines(property);
  const mapLink = mapHref(property);
  const canEditResolved = canEdit && Boolean(property.id) && Boolean(onEdit);
  const builder = (sectionId, stepId) => (
    property.id ? staysBuilderStepPath(property.id, sectionId, stepId) : ""
  );
  const categoryPath = property.id ? staysCategoryPath(property.id) : "";
  const hostSections = [
    hostProfile.property?.included && hostProfile.property?.about
      ? { label: "About the property", value: hostProfile.property.about }
      : null,
    hostProfile.host?.included
      ? {
          label: hostProfile.host?.name ? `About ${hostProfile.host.name}` : "About the host",
          value: hostProfile.host?.about,
        }
      : null,
    hostProfile.neighbourhood?.included && hostProfile.neighbourhood?.about
      ? { label: "About the neighbourhood", value: hostProfile.neighbourhood.about }
      : null,
  ].filter((section) => section && section.value);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Gallery
          key={property.id}
          property={property}
          photos={photos}
          edit={{ label: "Edit photos", path: builder("photos", "photos") }}
          canEdit={canEditResolved}
          onEdit={onEdit}
        />

        <PreviewSection
          title="Overview"
          edit={{ label: "Edit property details", path: builder("property-setup", "property-details") }}
          canEdit={canEditResolved}
          onEdit={onEdit}
        >
          <div className="flex flex-wrap items-center gap-2">
            <StaysPill tone={statusTone(property.status)}>{property.status}</StaysPill>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {property.bookingType || "Booking type not set"}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Fact icon={Users} label="Guests" value={property.maxGuests || 2} />
            <Fact icon={BedDouble} label="Bedrooms" value={bedrooms.length} />
            <Fact icon={Bath} label="Bathrooms" value={property.bathrooms || 1} />
            <Fact icon={DoorOpen} label="Room types" value={rooms.length} />
            <Fact
              icon={Ruler}
              label="Size"
              value={property.size ? `${property.size} ${property.sizeUnit || "square metres"}` : ""}
            />
            <Fact icon={Banknote} label="Nightly price" value={formatMoney(nightlyPrice, currency)} />
          </dl>
        </PreviewSection>
      </div>

        <PreviewSection
          title="About this property"
          icon={ScrollText}
          edit={{ label: "Edit description", path: builder("property-setup", "property-details") }}
          canEdit={canEditResolved}
          onEdit={onEdit}
        >
          {property.shortDescription && (
            <p className="text-sm font-semibold text-slate-800">{property.shortDescription}</p>
          )}
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {property.description || "No description provided yet."}
          </p>
        </PreviewSection>

        <PreviewSection
          title="Listing and booking settings"
          icon={Settings2}
          canEdit={false}
          onEdit={onEdit}
        >
          <dl>
            <SettingRow
              label="Property name"
              value={property.name}
              edit={{ label: "Edit property name", path: builder("property-setup", "identity") }}
              canEdit={canEditResolved}
              onEdit={onEdit}
            />
            <SettingRow
              label="Type and category"
              value={property.type}
              edit={{ label: "Edit type and category", path: categoryPath }}
              canEdit={canEditResolved}
              onEdit={onEdit}
            />
            <SettingRow
              label="Booking type"
              value={property.bookingType}
              edit={{ label: "Edit booking type", path: categoryPath }}
              canEdit={canEditResolved}
              onEdit={onEdit}
            />
            <SettingRow
              label="Listing scope"
              value={property.listingScope}
              edit={{ label: "Edit listing scope", path: categoryPath }}
              canEdit={canEditResolved}
              onEdit={onEdit}
            />
            <SettingRow
              label="Channel manager"
              value={
                property.channelManager?.connected
                  ? property.channelManager?.name || "Connected"
                  : "Not connected"
              }
              edit={{ label: "Edit channel manager", path: builder("basic-information", "channel-manager") }}
              canEdit={canEditResolved}
              onEdit={onEdit}
            />
            <SettingRow
              label="Booking preference"
              value={
                property.bookingPreference === "request"
                  ? "Guests request to book"
                  : "Instant booking"
              }
              edit={{ label: "Edit booking preference", path: builder("property-setup", "booking-preference") }}
              canEdit={canEditResolved}
              onEdit={onEdit}
            />
            <SettingRow
              label="Payments"
              value={property.payments?.mode}
              edit={{ label: "Edit payments", path: builder("property-setup", "payments") }}
              canEdit={canEditResolved}
              onEdit={onEdit}
            />
            <SettingRow
              label="Nightly price"
              value={formatMoney(nightlyPrice, currency)}
              edit={{ label: "Edit nightly price", path: builder("pricing-calendar", "price-per-night") }}
              canEdit={canEditResolved}
              onEdit={onEdit}
            />
            <SettingRow
              label="Publish status"
              value={property.status}
              edit={{ label: "Edit publish status", path: builder("review-submit", "review") }}
              canEdit={canEditResolved}
              onEdit={onEdit}
            />
          </dl>
        </PreviewSection>

        <PreviewSection
          title="Rooms"
          icon={BedDouble}
          edit={{ label: "Edit rooms", path: builder("property-setup", "property-details") }}
          canEdit={canEditResolved}
          onEdit={onEdit}
        >
          {rooms.length === 0 ? (
            <p className="text-sm text-slate-500">No room types configured yet.</p>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id || room.name}
                  room={room}
                  plans={ratePlans.filter((plan) => plan.roomId === room.id)}
                  currency={currency}
                />
              ))}
            </div>
          )}
        </PreviewSection>

        <PreviewSection
          title="Amenities and services"
          icon={Utensils}
          canEdit={false}
          onEdit={onEdit}
        >
          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Amenities
                </h4>
                <EditAction
                  label="Edit amenities"
                  path={builder("property-setup", "amenities")}
                  canEdit={canEditResolved}
                  onEdit={onEdit}
                />
              </div>
              <div className="mt-2">
                <ChipList items={facilities} empty="No amenities selected." />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Services
                </h4>
                <EditAction
                  label="Edit services"
                  path={builder("property-setup", "services")}
                  canEdit={canEditResolved}
                  onEdit={onEdit}
                />
              </div>
              <dl className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Fact label="Breakfast" value={services.breakfast || "No"} />
                <Fact label="Parking" value={services.parking || "No"} />
              </dl>
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Languages
                </h4>
                <EditAction
                  label="Edit languages"
                  path={builder("property-setup", "languages")}
                  canEdit={canEditResolved}
                  onEdit={onEdit}
                />
              </div>
              <div className="mt-2">
                <ChipList items={languages} empty="No languages selected." />
              </div>
            </div>
          </div>
        </PreviewSection>

        <PreviewSection
          title="Where guests sleep"
          icon={Users}
          edit={{ label: "Edit sleeping arrangements", path: builder("property-setup", "property-details") }}
          canEdit={canEditResolved}
          onEdit={onEdit}
        >
          {bedrooms.length === 0 && livingRoomBeds === 0 && otherSpacesBeds === 0 ? (
            <p className="text-sm text-slate-500">No sleeping arrangements provided.</p>
          ) : (
            <div className="space-y-2">
              {bedrooms.map((bedroom) => (
                <div
                  key={bedroom.id || bedroom.name}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <span className="text-sm font-medium text-slate-800">{bedroom.name}</span>
                  <span className="text-sm text-slate-500">{bedSummary(bedroom)}</span>
                </div>
              ))}
              {(livingRoomBeds > 0 || otherSpacesBeds > 0) && (
                <p className="text-xs text-slate-500">
                  {livingRoomBeds > 0
                    ? `${livingRoomBeds} bed(s) in the living room. `
                    : ""}
                  {otherSpacesBeds > 0
                    ? `${otherSpacesBeds} bed(s) in other spaces.`
                    : ""}
                </p>
              )}
            </div>
          )}
        </PreviewSection>

        <PreviewSection
          title="Pricing and rate-plan settings"
          icon={CircleDollarSign}
          edit={{ label: "Edit pricing and rate plans", path: builder("pricing-calendar", "rates") }}
          canEdit={canEditResolved}
          onEdit={onEdit}
        >
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Fact
              label="Cancellation policy"
              value={standard.cancellation || "Free up to 1 day before arrival"}
            />
            <Fact label="Price for 2 guests" value={formatMoney(twoGuests, currency)} />
            <Fact label="Price for 1 guest" value={formatMoney(oneGuest, currency)} />
            <Fact
              label="Children"
              value={childFree ? `Free up to age ${childMaxAge}` : `Up to age ${childMaxAge}`}
            />
            <Fact
              label="Non-refundable discount"
              value={`${nonRefundableDiscount}%`}
            />
            <Fact
              label="Weekly discount"
              value={`${weeklyDiscount}% for ${weeklyMinNights}+ nights`}
            />
          </dl>
        </PreviewSection>

        <PreviewSection
          title="Availability"
          icon={CalendarDays}
          edit={{ label: "Edit availability", path: builder("pricing-calendar", "availability") }}
          canEdit={canEditResolved}
          onEdit={onEdit}
        >
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Fact
              label="First bookable date"
              value={
                property.startMode === "date"
                  ? formatIsoDate(property.start) || "Not set"
                  : "As soon as possible"
              }
            />
            <Fact label="Calendar window" value={property.calendarWindow || "365 days"} />
            <Fact
              label="Calendar import"
              value={
                property.calendarImport?.mode === "import" && property.calendarImport?.url
                  ? `Importing from ${property.calendarImport.url}`
                  : "Not connected"
              }
            />
            <Fact
              label="30+ night stays"
              value={
                property.longStays === true || property.longStays === "Yes"
                  ? "Allowed"
                  : property.longStays === false || property.longStays === "No"
                    ? "Not allowed"
                    : "Not answered"
              }
            />
          </dl>
        </PreviewSection>

        <PreviewSection
          title="House rules"
          icon={ScrollText}
          edit={{ label: "Edit house rules", path: builder("property-setup", "house-rules") }}
          canEdit={canEditResolved}
          onEdit={onEdit}
        >
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Fact
              label="Check-in"
              value={`${property.checkin || "14:00"} – ${property.checkinEnd || "18:00"}`}
            />
            <Fact
              label="Check-out"
              value={`${property.checkoutStart || "08:00"} – ${property.checkout || "11:00"}`}
            />
            <Fact
              label="Smoking"
              value={property.smoking === "Allowed" ? "Allowed" : "No smoking"}
            />
            <Fact
              label="Parties"
              value={property.parties === "Allowed" ? "Allowed" : "Not allowed"}
            />
            <Fact label="Pets" value={property.pets || "Not allowed"} />
            <Fact label="Children" value={property.children || "Welcome"} />
            <Fact label="Cots" value={property.cots || "Not available"} />
          </dl>
        </PreviewSection>


        <PreviewSection
          title="Host profile"
          icon={UserRound}
          edit={{ label: "Edit host profile", path: builder("property-setup", "host-profile") }}
          canEdit={canEditResolved}
          onEdit={onEdit}
        >
          {hostSections.length === 0 ? (
            <p className="text-sm text-slate-500">No host profile provided yet.</p>
          ) : (
            <div className="space-y-4">
              {hostSections.map((section) => (
                <div key={section.label}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {section.label}
                  </h4>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                    {section.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </PreviewSection>

        <PreviewSection
          title="Location"
          icon={MapPin}
          edit={{ label: "Edit location", path: builder("basic-information", "location") }}
          canEdit={canEditResolved}
          onEdit={onEdit}
        >
          {address.length === 0 ? (
            <p className="text-sm text-slate-500">No address provided yet.</p>
          ) : (
            <div>
              <p className="text-sm leading-relaxed text-slate-700">{address.join(", ")}</p>
              {property.mapAddress && property.mapAddress !== address.join(", ") && (
                <p className="mt-1 text-xs text-slate-500">{property.mapAddress}</p>
              )}
              {mapLink && (
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  <MapPin size={14} aria-hidden="true" />
                  Open in Google Maps
                </a>
              )}
            </div>
          )}
        </PreviewSection>
    </div>
  );
}
