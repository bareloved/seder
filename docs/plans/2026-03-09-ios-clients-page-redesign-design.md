# iOS Clients Page Redesign

## Goal

Comprehensive upgrade of the iOS clients page: visual polish, search/sort, richer detail sheet with recent jobs, and improved empty state.

## Approach

Enhanced List + Rich Sheet (Approach A) — keep the existing list + sheet pattern, level everything up without rearchitecting to a NavigationStack push.

## Section 1: Search & Sort

- **Search bar** below the green navbar. Rounded field with magnifying glass icon, placeholder "חיפוש לקוח...". Filters by name, email, or phone as-you-type.
- **Sort button** next to/inside the search area. Menu with options: שם (Name, default), הכנסות (Revenue), עבודות (Jobs), חוב (Outstanding). Re-tap toggles ascending/descending. Active sort shows chevron indicator.
- All client-side filtering/sorting on the loaded `clients` array. No new API calls.

## Section 2: Client Row Redesign

RTL layout (right to left):

```
┌─────────────────────────────────────────────┐
│  [א]  שם הלקוח                    ₪12,500  │
│        email@example.com        5 עבודות ▸  │
│                                  ₪2,000 חוב │
└─────────────────────────────────────────────┘
```

- Avatar: green circle with initial (unchanged)
- Name: `.semibold`, primary text
- Email: below name, tertiary color
- Revenue column (left side in RTL): year revenue in green, job count in secondary, outstanding in orange if > 0
- Chevron: `chevron.left` at far left edge for tappability affordance
- Subtle shadow on cards instead of just border stroke

## Section 3: Detail Sheet

Detents: `.large` (default), `.medium` (collapsed).

**Header**: Client name (large) + avatar circle. Below: tap-to-call and tap-to-email circular action buttons (only shown if client has phone/email). Opens native phone/mail app.

**Analytics Grid**: 2-column grid:
- סה״כ הכנסות (Total earned)
- השנה (This year)
- עבודות (Job count)
- ממוצע לעבודה (Average per job)
- ממתין לתשלום (Outstanding, orange, only if > 0)

**Recent Jobs**: Section header "עבודות אחרונות", last 5 income entries for this client. Each row: date (short), description, gross amount, status badge. Tapping opens `IncomeDetailSheet`.

Requires new ViewModel method to fetch income entries filtered by `clientName`.

**Notes**: Unchanged — quote icon, text block, subtle background.

## Section 4: Empty State & Polish

- **Empty state icon**: `person.crop.rectangle.stack` or similar (more inviting)
- **Copy**: "אין לקוחות עדיין" / "הוסף לקוח ראשון כדי להתחיל לעקוב"
- **Card shadow**: Subtle shadow on client rows
- **Loading**: Keep spinner (simple)
- **No changes to**: ClientFormSheet, FAB design, navbar
