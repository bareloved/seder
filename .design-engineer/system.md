# Seder Design System

## Intent

**Who:** Israeli freelancers and musicians managing income from gigs, lessons, recordings. Working from phones between jobs or sitting down on weekends to handle invoicing. Hebrew-first, financially mindful but not accountants.

**Task:** Track jobs done → invoice them → mark as paid. See money flow at a glance: what's owed, what's coming, what landed.

**Feel:** Clean and organized like a well-kept ledger, but modern. Financial clarity without spreadsheet anxiety. Warm but professional - this is their livelihood, not corporate accounting.

---

## Palette

### Brand
- **Primary Green:** `#2ecc71` (brand-primary) - Money, growth, success
- **Primary Green Hover:** `#27ae60`
- **Primary Foreground:** `#ffffff`

### Foundation (Light)
- **Background:** `#F0F2F5` - Warm gray canvas
- **Card:** `#ffffff` - White surfaces
- **Border:** `hsl(214.3, 31.8%, 91.4%)` - Subtle card edges
- **Text Primary:** `hsl(222.2, 84%, 4.9%)` - Near black
- **Text Muted:** `hsl(215.4, 16.3%, 46.9%)` - Secondary text

### Foundation (Dark - GitHub style)
- **Background:** `#0d1117`
- **Card:** `#161b22`
- **Border:** `#30363d`
- **Text Primary:** `#e6edf3`
- **Text Muted:** `#8b949e`

### Status Colors
Status uses a three-stage money flow: **No Invoice → Invoice Sent → Paid**

| Status | Background | Text | Border | Icon |
|--------|------------|------|--------|------|
| Ready to Invoice (sky) | `bg-sky-50` | `text-sky-600` | `border-sky-200` | `text-sky-500` |
| Invoice Sent (amber) | `bg-amber-50` | `text-amber-600` | `border-amber-200` | `text-amber-500` |
| Paid (emerald) | `bg-emerald-50` | `text-emerald-600` | `border-emerald-200` | `text-emerald-500` |
| Overdue (orange) | `bg-orange-50` | `text-orange-600` | `border-orange-200` | `text-orange-500` |

### Category Colors (User-customizable)
Categories use soft pastel backgrounds with saturated text:
- Pink: `bg-pink-100 text-pink-600`
- Purple: `bg-purple-100 text-purple-600`
- Blue: `bg-blue-100 text-blue-600`
- Emerald: `bg-emerald-100 text-emerald-600`
- Amber: `bg-amber-100 text-amber-600`

---

## Typography

### Font Stack
```css
--font-sans: var(--font-ploni), Heebo, sans-serif; /* Hebrew text */
--font-numbers: var(--font-montserrat), Montserrat, sans-serif; /* Currency, amounts */
```

### Scale
- **Page Title:** `text-lg font-semibold` (e.g., "ינואר 2025")
- **KPI Value:** `text-base font-semibold font-numbers` with `dir="ltr"`
- **KPI Label:** `text-[10px] text-slate-500`
- **Table Text:** `text-sm`
- **Badge/Chip:** `text-[9px] font-medium`
- **Secondary:** `text-xs text-slate-400`

### RTL Guidelines
- All containers: `dir="rtl"`
- Numbers and currency: `dir="ltr"` for proper digit rendering
- Use `text-start/text-end` not `text-left/text-right`
- Use `ms-/me-` (margin-start/end) not `ml-/mr-`

---

## Depth & Elevation

### Approach
Subtle layering - clean surfaces without heavy shadows. Cards float gently above the canvas.

### Elevation Scale
1. **Canvas:** `bg-[#F0F2F5]` - The base layer
2. **Card:** `bg-white rounded-xl shadow-sm border border-slate-200/60` - Primary content containers
3. **Floating:** `shadow-xl rounded-xl` - Dialogs, popovers, floating elements
4. **Interactive:** `shadow-lg` - Buttons with elevation (FAB)

### Border Radius
- **Cards/Dialogs:** `rounded-xl` (12px) or `rounded-2xl` (16px)
- **Buttons/Inputs:** `rounded-lg` (8px)
- **Badges/Chips:** `rounded` (6px) or `rounded-full` (pills)
- **Icons in circles:** `rounded-full`

---

## Spacing

### Base Unit
4px (Tailwind default). Use multiples: 1, 2, 3, 4, 6, 8, 12, 16, 20, 24.

### Common Patterns
- **Card padding:** `p-4` (16px)
- **Section gap:** `space-y-3` mobile, `space-y-6` desktop
- **Inline gap:** `gap-2` (8px) or `gap-3` (12px)
- **Page margins:** `px-2 sm:px-12 lg:px-20`

---

## Component Patterns

### KPI Cards
```tsx
<div className="bg-white border border-slate-100 rounded-lg p-2 shadow-sm">
  <span className="text-[10px] text-slate-500 block">{label}</span>
  <div className="text-base font-semibold text-slate-900" dir="ltr">
    <span className="text-xs">₪</span> {amount}
  </div>
  <Icon className="w-2.5 h-2.5 text-slate-400 mt-1" />
</div>
```

Highlighted state (e.g., actionable): Add `ring-1 ring-sky-500 border-sky-200`

### Status Badge
```tsx
<div className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-50 text-emerald-600">
  שולם
</div>
```

### Category Chip
```tsx
<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-600">
  הופעות
</span>
```

### Income Entry Row
```tsx
<div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
  {/* Status icon + badge */}
  {/* Description + date */}
  {/* Amount */}
  {/* Category chip */}
</div>
```

### Floating Action Button (Mobile)
```tsx
<Button
  size="icon"
  className="fixed bottom-20 right-4 h-9 w-9 rounded-full shadow-sm bg-[#2ecc71] hover:bg-[#27ae60] text-white"
>
  <Plus className="h-5 w-5" />
</Button>
```

---

## Iconography

Using Lucide React icons consistently:
- **Size in KPIs:** `w-2.5 h-2.5` or `w-3 h-3`
- **Size in buttons:** `w-4 h-4` or `w-5 h-5`
- **Size in nav:** `w-6 h-6`

### Common Icons
- Calendar: `<Calendar />` - Date/time related
- FileText: `<FileText />` - Invoices
- Wallet: `<Wallet />` - Payments pending
- TrendingUp: `<TrendingUp />` - Income/growth
- CheckCircle2: `<CheckCircle2 />` - Completed/paid
- Plus: `<Plus />` - Add new
- Send: `<Send />` - Invoice sent

---

## Motion

### Transitions
- **Default:** `transition-colors` for color changes
- **Buttons/Cards:** `transition-all duration-200`
- **Accordion:** `accordion-down/up 0.2s ease-out`

### Loading States
- Spinner: `border-emerald-500 border-t-transparent animate-spin`
- Skeleton: Pulsing gray rectangles

---

## Dark Mode

Dark mode follows GitHub's dark palette:
- Apply via `.dark` class on root
- Card surfaces slightly elevated from background
- Status colors maintain their semantic meaning with adjusted backgrounds
- Paper texture removed in dark mode (clean solid backgrounds)

---

## Responsive Breakpoints

```
sm: 640px   - Tablet
md: 768px   - Desktop threshold (hide mobile nav, show desktop layouts)
lg: 1024px  - Wide desktop
xl: 1280px  - Extra wide
2xl: 1400px - Max container width
```

### Mobile-First Patterns
- `hidden md:flex` - Desktop only
- `md:hidden` - Mobile only
- `px-2 sm:px-12 lg:px-20` - Progressive padding
