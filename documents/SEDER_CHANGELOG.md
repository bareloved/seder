# Seder – Changelog

> Lightweight changelog for Seder.  
> Purpose: quickly see what changed lately and give AI agents context on the current state of the app.

## How to Use This File

- Add a new section at the top for each meaningful development session.
- Use the format: `## YYYY-MM-DD` (e.g., `## 2025-12-05`).
- Under each date, add short bullet points covering what was added/removed/changed and any notes for future work.

## 2026-01-25

**Onboarding**
- Added spotlight-based onboarding tour for first-time users.
- Tour guides users through adding income, understanding KPIs, and calendar import.
- Improved tour tooltip positioning on mobile devices.
- Added inline category creation during onboarding flow.
- Added help button to restart tour at any time.

**Categories**
- Refactored categories: moved new category button to footer in category dialog.
- Categories now support full CRUD (name, color, icon, displayOrder).

**Settings & Account**
- Added comprehensive settings page with tabs: account, preferences, calendar, data, danger zone.
- Implemented secure account deletion with "DELETE" text confirmation (instead of password).
- Added password requirements UI for signup.
- Added OTP-based password reset with email verification.

**Authentication**
- Redesigned sign-in page with split-screen layout and brand panel on desktop.
- Added trustedOrigins to prevent session loss after deployment.

**Landing Page**
- Added Hebrew-first landing page for guest users.
- Includes hero section, feature showcase, how it works, testimonials, and CTA.
- Enhanced visual design with colors, backgrounds, and animations.
- Updated hero mockup to reflect actual app features.

**Mobile UX**
- Improved mobile experience with touch tooltips and layout fixes.
- Added floating action button for quick income entry.
- Redesigned status icons with split-pill status component.
- Improved filter layout on mobile.
- Added accessibility labels (DialogDescription) to dialogs.

**Analytics**
- Added analytics page with date range filtering.
- KPI cards showing total gross, paid, outstanding, and job count.
- Income over time chart (line/bar visualization).
- Income by category chart (pie/donut).
- Needs attention table for overdue/pending items.

**Clients**
- Added clients page with client directory.
- Client management with contact info, notes, and default rates.
- Duplicate client name detection.

## 2025-12-05

- Added "Category" column to the incomes table with inline editable dropdown.
- Improved description column: allows wrapping to 2 lines for long text only.
- Fixed header alignment in incomes table.




