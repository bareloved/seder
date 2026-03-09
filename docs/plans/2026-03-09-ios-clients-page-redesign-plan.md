# iOS Clients Page Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the iOS clients page with search/sort, visual card redesign, rich detail sheet with recent jobs, and polished empty state.

**Architecture:** Client-side search/sort on already-loaded clients array. New API query param on `/api/v1/income?clientName=X` for fetching recent jobs per client. All changes in existing files — no new files except the API param addition.

**Tech Stack:** SwiftUI, existing SederTheme, APIClient, StatusBadge component, CurrencyText component.

---

### Task 1: Add Search & Sort State to ClientsViewModel

**Files:**
- Modify: `apps/ios/Seder/Seder/ViewModels/ClientsViewModel.swift`

**Step 1: Add published properties for search/sort and the client entries fetcher**

Add these properties and the `loadClientEntries` method to `ClientsViewModel`:

```swift
// Add below existing @Published properties (line 8):
@Published var searchQuery = ""
@Published var sortOption: ClientSortOption = .name
@Published var sortAscending = true
@Published var clientEntries: [IncomeEntry] = []
@Published var isLoadingEntries = false

// Add enum above the class:
enum ClientSortOption: String, CaseIterable {
    case name, revenue, jobs, outstanding

    var label: String {
        switch self {
        case .name: return "שם"
        case .revenue: return "הכנסות"
        case .jobs: return "עבודות"
        case .outstanding: return "חוב"
        }
    }
}
```

**Step 2: Add computed property for filtered/sorted clients**

```swift
var filteredClients: [Client] {
    var result = clients

    // Search
    if !searchQuery.isEmpty {
        let q = searchQuery.lowercased()
        result = result.filter {
            $0.name.lowercased().contains(q) ||
            ($0.email?.lowercased().contains(q) ?? false) ||
            ($0.phone?.contains(q) ?? false)
        }
    }

    // Sort
    result.sort { a, b in
        let cmp: Bool
        switch sortOption {
        case .name:
            cmp = a.name.localizedCompare(b.name) == .orderedAscending
        case .revenue:
            cmp = (a.thisYearRevenue ?? 0) < (b.thisYearRevenue ?? 0)
        case .jobs:
            cmp = (a.jobCount ?? 0) < (b.jobCount ?? 0)
        case .outstanding:
            cmp = (a.outstandingAmount ?? 0) < (b.outstandingAmount ?? 0)
        }
        return sortAscending ? cmp : !cmp
    }

    return result
}
```

**Step 3: Add method to fetch recent income entries for a client**

```swift
func loadClientEntries(_ clientName: String) async {
    isLoadingEntries = true
    defer { isLoadingEntries = false }

    do {
        clientEntries = try await api.request(
            endpoint: "/api/v1/income",
            queryItems: [URLQueryItem(name: "clientName", value: clientName)]
        )
    } catch {
        print("[CLIENTS] Failed to load entries for \(clientName): \(error)")
        clientEntries = []
    }
}
```

**Step 4: Commit**

```bash
git add apps/ios/Seder/Seder/ViewModels/ClientsViewModel.swift
git commit -m "feat(ios): add search, sort, and client entries to ClientsViewModel"
```

---

### Task 2: Add `clientName` Query Param to Income API

**Files:**
- Modify: `apps/web/app/api/v1/income/route.ts`
- Modify: `apps/web/app/income/data.ts`

**Step 1: Add a `getRecentEntriesForClient` function to data.ts**

Add at the end of the file, before any type exports:

```typescript
export async function getRecentEntriesForClient({
  clientName,
  userId,
  limit = 5,
}: {
  clientName: string;
  userId: string;
  limit?: number;
}) {
  const db = await getDb();
  return db
    .select({
      id: incomeEntries.id,
      date: incomeEntries.date,
      description: incomeEntries.description,
      clientName: incomeEntries.clientName,
      clientId: incomeEntries.clientId,
      amountGross: incomeEntries.amountGross,
      amountPaid: incomeEntries.amountPaid,
      vatRate: incomeEntries.vatRate,
      includesVat: incomeEntries.includesVat,
      invoiceStatus: incomeEntries.invoiceStatus,
      paymentStatus: incomeEntries.paymentStatus,
      categoryId: incomeEntries.categoryId,
      notes: incomeEntries.notes,
      invoiceSentDate: incomeEntries.invoiceSentDate,
      paidDate: incomeEntries.paidDate,
      calendarEventId: incomeEntries.calendarEventId,
      createdAt: incomeEntries.createdAt,
      updatedAt: incomeEntries.updatedAt,
    })
    .from(incomeEntries)
    .where(
      and(
        eq(incomeEntries.userId, userId),
        eq(incomeEntries.clientName, clientName)
      )
    )
    .orderBy(desc(incomeEntries.date))
    .limit(limit);
}
```

**Step 2: Handle the `clientName` query param in route.ts GET handler**

In the GET function, after the `const month = searchParams.get("month")` line, add:

```typescript
const clientName = searchParams.get("clientName");

if (clientName) {
  const entries = await getRecentEntriesForClient({ clientName, userId });
  return apiSuccess(entries);
}
```

Make sure to import `getRecentEntriesForClient` from `@/app/income/data`.

**Step 3: Commit**

```bash
git add apps/web/app/api/v1/income/route.ts apps/web/app/income/data.ts
git commit -m "feat(api): add clientName query param to income endpoint for recent jobs"
```

---

### Task 3: Redesign ClientsView — Search Bar & Sort

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Clients/ClientsView.swift`

**Step 1: Add search bar and sort menu below the navbar**

Replace the `Group` block (lines 26-38 in current file) with a search/sort bar + the content. Insert between the navbar and the Group:

```swift
// Search + Sort bar
HStack(spacing: 8) {
    // Search field (first = right in RTL)
    HStack(spacing: 8) {
        Image(systemName: "magnifyingglass")
            .font(.system(size: 14))
            .foregroundStyle(SederTheme.textTertiary)
        TextField("חיפוש לקוח...", text: $viewModel.searchQuery)
            .font(SederTheme.ploni(16))
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 8)
    .background(SederTheme.subtleBg)
    .clipShape(RoundedRectangle(cornerRadius: 8))

    // Sort button (last = left in RTL)
    Menu {
        ForEach(ClientSortOption.allCases, id: \.self) { option in
            Button {
                if viewModel.sortOption == option {
                    viewModel.sortAscending.toggle()
                } else {
                    viewModel.sortOption = option
                    viewModel.sortAscending = true
                }
            } label: {
                HStack {
                    Text(option.label)
                    if viewModel.sortOption == option {
                        Image(systemName: viewModel.sortAscending ? "chevron.up" : "chevron.down")
                    }
                }
            }
        }
    } label: {
        Image(systemName: "arrow.up.arrow.down")
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(
                viewModel.sortOption == .name ? SederTheme.textSecondary : SederTheme.brandGreen
            )
            .frame(width: 36, height: 36)
            .background(SederTheme.subtleBg)
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
.padding(.horizontal, 12)
.padding(.top, 8)
.padding(.bottom, 4)
```

**Step 2: Update clientList to use `viewModel.filteredClients`**

In the `clientList` computed property, change `ForEach(viewModel.clients)` to `ForEach(viewModel.filteredClients)`.

**Step 3: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Clients/ClientsView.swift
git commit -m "feat(ios): add search bar and sort menu to clients page"
```

---

### Task 4: Redesign Client Row Card

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Clients/ClientsView.swift`

**Step 1: Replace the `clientRow` function**

Replace the entire `clientRow(_ client:)` function with:

```swift
private func clientRow(_ client: Client) -> some View {
    HStack(spacing: 12) {
        // Avatar (first = right in RTL)
        Text(String(client.name.prefix(1)))
            .font(SederTheme.ploni(16, weight: .semibold))
            .foregroundStyle(SederTheme.brandGreen)
            .frame(width: 40, height: 40)
            .background(SederTheme.brandGreen.opacity(0.1))
            .clipShape(Circle())

        // Name + email
        VStack(alignment: .leading, spacing: 2) {
            Text(client.name)
                .font(SederTheme.ploni(17, weight: .semibold))
                .foregroundStyle(SederTheme.textPrimary)
            if let email = client.email, !email.isEmpty {
                Text(email)
                    .font(SederTheme.ploni(13))
                    .foregroundStyle(SederTheme.textTertiary)
                    .lineLimit(1)
            }
        }

        Spacer()

        // Revenue + stats (last = left in RTL)
        VStack(alignment: .trailing, spacing: 2) {
            if let revenue = client.thisYearRevenue, revenue > 0 {
                CurrencyText(
                    amount: revenue,
                    size: 15,
                    weight: .medium,
                    color: SederTheme.paidColor
                )
            }
            if let jobs = client.jobCount, jobs > 0 {
                Text("\(jobs) עבודות")
                    .font(SederTheme.ploni(12))
                    .foregroundStyle(SederTheme.textSecondary)
            }
            if let outstanding = client.outstandingAmount, outstanding > 0 {
                HStack(spacing: 2) {
                    Text("חוב")
                        .font(SederTheme.ploni(11))
                    CurrencyText(
                        amount: outstanding,
                        size: 12,
                        weight: .regular,
                        color: SederTheme.sentColor
                    )
                }
                .foregroundStyle(SederTheme.sentColor)
            }
        }

        // Chevron (far left in RTL)
        Image(systemName: "chevron.left")
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(SederTheme.textTertiary)
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 12)
    .background(SederTheme.cardBg)
    .clipShape(RoundedRectangle(cornerRadius: 10))
    .shadow(color: .black.opacity(0.04), radius: 3, y: 1)
}
```

**Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Clients/ClientsView.swift
git commit -m "feat(ios): redesign client row card with chevron and shadow"
```

---

### Task 5: Redesign ClientDetailSheet — Header & Contact Actions

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Clients/ClientsView.swift` (ClientDetailSheet struct)

**Step 1: Replace the header section**

Replace the entire `ClientDetailSheet` body with the new design. The header should have:

```swift
var body: some View {
    VStack(spacing: 0) {
        // Header with avatar + name + contact actions
        VStack(spacing: 12) {
            HStack {
                // Name + avatar (right in RTL)
                HStack(spacing: 12) {
                    Text(String(client.name.prefix(1)))
                        .font(SederTheme.ploni(20, weight: .semibold))
                        .foregroundStyle(SederTheme.brandGreen)
                        .frame(width: 48, height: 48)
                        .background(SederTheme.brandGreen.opacity(0.1))
                        .clipShape(Circle())

                    Text(client.name)
                        .font(SederTheme.ploni(22, weight: .semibold))
                        .foregroundStyle(SederTheme.textPrimary)
                }

                Spacer()

                // Dismiss (left in RTL)
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(SederTheme.textSecondary)
                        .frame(width: 28, height: 28)
                        .background(SederTheme.subtleBg)
                        .clipShape(Circle())
                }
            }

            // Contact action buttons
            if client.phone != nil || client.email != nil {
                HStack(spacing: 12) {
                    if let phone = client.phone, !phone.isEmpty {
                        contactActionButton(
                            icon: "phone.fill",
                            label: "חייג",
                            color: SederTheme.brandGreen
                        ) {
                            if let url = URL(string: "tel:\(phone)") {
                                UIApplication.shared.open(url)
                            }
                        }
                    }
                    if let email = client.email, !email.isEmpty {
                        contactActionButton(
                            icon: "envelope.fill",
                            label: "אימייל",
                            color: SederTheme.draftColor
                        ) {
                            if let url = URL(string: "mailto:\(email)") {
                                UIApplication.shared.open(url)
                            }
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
        .padding(.bottom, 14)

        Divider()

        // ... ScrollView content (next task)
    }
    .background(SederTheme.pageBg)
    .environment(\.layoutDirection, .rightToLeft)
}
```

**Step 2: Add the contactActionButton helper**

```swift
private func contactActionButton(icon: String, label: String, color: Color, action: @escaping () -> Void) -> some View {
    Button(action: action) {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .medium))
            Text(label)
                .font(SederTheme.ploni(14, weight: .medium))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(color.opacity(0.1))
        .clipShape(Capsule())
    }
}
```

**Step 3: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Clients/ClientsView.swift
git commit -m "feat(ios): redesign client detail header with contact action buttons"
```

---

### Task 6: Redesign ClientDetailSheet — Analytics + Recent Jobs + Notes

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Clients/ClientsView.swift` (ClientDetailSheet)

**Step 1: Replace the ScrollView content**

The ScrollView inside the detail sheet body should contain analytics, recent jobs, and notes:

```swift
ScrollView {
    VStack(spacing: 20) {
        // Analytics grid
        if client.jobCount ?? 0 > 0 {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                analyticsCard(label: "סה״כ הכנסות", value: formatCurrency(client.totalEarned ?? 0))
                analyticsCard(label: "השנה", value: formatCurrency(client.thisYearRevenue ?? 0))
                analyticsCard(label: "עבודות", value: "\(client.jobCount ?? 0)")
                analyticsCard(label: "ממוצע לעבודה", value: formatCurrency(client.averagePerJob ?? 0))
                if let outstanding = client.outstandingAmount, outstanding > 0 {
                    analyticsCard(label: "ממתין לתשלום", value: formatCurrency(outstanding), color: SederTheme.sentColor)
                }
            }
        }

        // Recent jobs
        if !viewModel.clientEntries.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("עבודות אחרונות")
                    .font(SederTheme.ploni(15, weight: .medium))
                    .foregroundStyle(SederTheme.textSecondary)

                ForEach(viewModel.clientEntries.prefix(5)) { entry in
                    Button {
                        selectedEntry = entry
                    } label: {
                        recentJobRow(entry)
                    }
                    .buttonStyle(.plain)
                }
            }
        } else if viewModel.isLoadingEntries {
            ProgressView()
                .tint(SederTheme.brandGreen)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
        }

        // Notes
        if let notes = client.notes, !notes.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 4) {
                    Image(systemName: "text.quote")
                        .font(.system(size: 12))
                        .foregroundStyle(SederTheme.textTertiary)
                    Text("הערות")
                        .font(SederTheme.ploni(14, weight: .medium))
                        .foregroundStyle(SederTheme.textSecondary)
                }
                Text(notes)
                    .font(SederTheme.ploni(16))
                    .foregroundStyle(SederTheme.textPrimary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(SederTheme.subtleBg)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
    .padding(.horizontal, 20)
    .padding(.top, 16)
}
```

**Step 2: Add `recentJobRow` helper and state**

Add `@State private var selectedEntry: IncomeEntry?` to the struct properties.

```swift
private func recentJobRow(_ entry: IncomeEntry) -> some View {
    HStack(spacing: 10) {
        // Date
        Text(shortDate(entry.date))
            .font(.system(size: 13, weight: .medium, design: .rounded).monospacedDigit())
            .foregroundStyle(SederTheme.textSecondary)
            .frame(width: 42)

        // Description
        Text(entry.description)
            .font(SederTheme.ploni(15))
            .foregroundStyle(SederTheme.textPrimary)
            .lineLimit(1)

        Spacer()

        // Amount
        CurrencyText(
            amount: entry.grossAmount,
            size: 14,
            weight: .medium,
            color: entry.paymentStatus == .paid ? SederTheme.paidColor : SederTheme.textPrimary
        )

        // Status badge
        StatusBadge(
            text: entry.invoiceStatus.label,
            color: jobStatusColor(entry)
        )
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 10)
    .background(SederTheme.subtleBg)
    .clipShape(RoundedRectangle(cornerRadius: 8))
}

private func shortDate(_ dateStr: String) -> String {
    let parts = dateStr.split(separator: "-")
    guard parts.count >= 3 else { return dateStr }
    return "\(parts[2])/\(parts[1])"
}

private func jobStatusColor(_ entry: IncomeEntry) -> Color {
    if entry.paymentStatus == .paid { return SederTheme.paidColor }
    if entry.invoiceStatus == .sent { return SederTheme.sentColor }
    return SederTheme.draftColor
}
```

**Step 3: Add `.task` to load entries and `.sheet` for selected entry**

On the outer VStack in the body, add:

```swift
.task { await viewModel.loadClientEntries(client.name) }
.sheet(item: $selectedEntry) { entry in
    IncomeDetailSheet(
        viewModel: IncomeViewModel(),
        entry: entry,
        categories: [],
        clientNames: []
    )
    .presentationDetents([.medium, .large])
}
```

**Step 4: Update the `.presentationDetents` in ClientsView**

In the main `ClientsView` where the detail sheet is presented, change:
```swift
.presentationDetents([.medium])
```
to:
```swift
.presentationDetents([.medium, .large])
```

**Step 5: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Clients/ClientsView.swift
git commit -m "feat(ios): add recent jobs and polished analytics to client detail sheet"
```

---

### Task 7: Polish Empty State

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Clients/ClientsView.swift`

**Step 1: Replace the `emptyState` computed property**

```swift
private var emptyState: some View {
    VStack(spacing: 16) {
        Spacer()
        Image(systemName: "person.crop.rectangle.stack")
            .font(.system(size: 44))
            .foregroundStyle(SederTheme.textTertiary)

        Text("אין לקוחות עדיין")
            .font(SederTheme.ploni(18, weight: .medium))
            .foregroundStyle(SederTheme.textSecondary)

        Text("הוסף לקוח ראשון כדי להתחיל לעקוב")
            .font(SederTheme.ploni(15))
            .foregroundStyle(SederTheme.textTertiary)
            .multilineTextAlignment(.center)

        Button {
            editingClient = nil
            showFormSheet = true
        } label: {
            Text("הוסף לקוח")
                .font(SederTheme.ploni(16, weight: .medium))
                .foregroundStyle(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 10)
                .background(SederTheme.brandGreen)
                .clipShape(Capsule())
        }
        .padding(.top, 8)

        Spacer()
    }
}
```

**Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Clients/ClientsView.swift
git commit -m "feat(ios): polish empty state with better icon and copy"
```

---

### Task 8: Final Review & Cleanup

**Step 1: Verify all RTL alignment**

Read through the entire `ClientsView.swift` and confirm:
- `.environment(\.layoutDirection, .rightToLeft)` on the root ZStack
- All HStack items: first = right, last = left
- VStack alignments: `.leading` = right in RTL context
- Detail sheet has RTL environment
- Contact action buttons use `UIApplication.shared.open` correctly

**Step 2: Build test**

Open Xcode and build the project to verify no compilation errors:
- Check that `IncomeDetailSheet` initializer matches (it takes `viewModel`, `entry`, `categories`, `clientNames`)
- Check that `IncomeEntry` conforms to `Identifiable` (it does, has `id`)
- Check that `StatusBadge` initializer matches
- Check that `CurrencyText` initializer matches

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(ios): complete clients page redesign with search, sort, rich detail"
```
