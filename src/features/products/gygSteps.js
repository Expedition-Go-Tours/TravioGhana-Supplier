export const GYG_SECTIONS = [
  { id: 'getting-started', label: 'Getting Started' },
  {
    id: 'product-content',
    label: 'Product Content',
    collapsible: true,
    subItems: [
      { id: 'whats-included', label: "What's included?" },
      { id: 'guide-info', label: 'Guide information' },
      { id: 'food', label: 'Food' },
    ],
  },
  { id: 'media', label: 'Media' },
  { id: 'option-setup', label: 'Option Setup' },
]

export const GYG_STEPS = [
  { id: 1, label: 'Language', sectionId: 'getting-started', stepId: 'language' },
  { id: 2, label: 'Title & Reference Code', sectionId: 'getting-started', stepId: 'title' },
  { id: 3, label: 'Product Category', sectionId: 'getting-started', stepId: 'category' },
  { id: 4, label: 'Descriptions & highlights', sectionId: 'product-content', stepId: 'descriptions' },
  { id: 5, label: 'Locations & Itinerary', sectionId: 'product-content', stepId: 'locations' },
  { id: 6, label: 'Keywords and activities', sectionId: 'product-content', stepId: 'keywords' },
  { id: 7, label: 'Inclusions', sectionId: 'product-content', stepId: 'inclusions' },
  { id: 8, label: 'Guide information', sectionId: 'product-content', stepId: 'guide-info' },
  { id: 9, label: 'Extra information', sectionId: 'product-content', stepId: 'extra-info' },
  { id: 10, label: 'Cancellation Policy', sectionId: 'product-content', stepId: 'cancellation-policy' },
  { id: 11, label: 'Photos', sectionId: 'media', stepId: 'photos' },
  { id: 12, label: 'Booking Options', sectionId: 'option-setup', stepId: 'options' },
  { id: 13, label: 'Meeting Point or Pickup', sectionId: 'option-setup', stepId: 'meeting-point' },
  { id: 14, label: 'Itinerary Preview', sectionId: 'option-setup', stepId: 'itinerary-preview' },
  { id: 15, label: 'Pricing & Availability', sectionId: 'option-setup', stepId: 'pricing' },
  { id: 16, label: 'Cut-off', sectionId: 'option-setup', stepId: 'cutoff' },
]


