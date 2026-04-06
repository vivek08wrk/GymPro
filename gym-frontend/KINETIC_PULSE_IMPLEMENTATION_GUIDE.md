# Kinetic Pulse Design System - Implementation Guide

## ✅ Completed Refactoring

### 1. Foundation Layer
- ✅ **tailwind.config.js** - Full color system with custom tokens:
  - Deep Carbon palette (#0e0e0e to #262626)
  - Electric Lime (#cafd00) primary
  - Neon Orange (#ff7439) secondary
  - Cyber Cyan (#8ff5ff) tertiary
  - Custom utilities: `rounded-kinetic` (10px), `backdrop-blur-heavy` (20px), `shadow-kinetic`

- ✅ **layout.js** - Global setup:
  - Added Inter Tight font family
  - Dark mode enabled (`dark` class)
  - Background set to `bg-surface` (#0e0e0e)
  - Text color set to `text-on-surface`

### 2. Pages Refactored

#### ✅ Dashboard (`dashboard/page.js`)
**Key Changes:**
- Hero section with "Welcome Back, Athlete"
- Performance ring (75% intensity)
- Glass morphism cards with NO borders (using bg-surface-container shifts)
- Stats: Total Members, Active Today, Active Members, Total Revenue
- Weekly intensity heatmap
- Monthly revenue chart with dark theme
- Quick actions grid with gas card effects
- Mobile bottom nav with Electric Lime CTA
- All text using `font-inter-tight` with `tracking-tighter`
- Buttons using 10px radius (`rounded-kinetic`)

**Color Application:**
- Background: `bg-surface` (#0e0e0e)
- Cards: `bg-surface-container-high/50 backdrop-blur-heavy`
- Primary accent: `text-primary` (Electric Lime #cafd00)
- Hover states: `hover:bg-surface-container-high/70`

#### ✅ Login (`login/page.js`)
**Key Changes:**
- Glassmorphic card: `bg-surface-container-high/50 backdrop-blur-heavy`
- Form inputs with dark theme: `bg-surface-container-low`
- Electric Lime button with `bg-primary hover:bg-primary-light`
- Error messages styled with secondary Orange: `bg-secondary/20 text-secondary`
- Full uppercase labels with `tracking-widest`

---

## 📋 Remaining Pages to Refactor

### TODO: Members List (`members/page.js`)
**Current State:** Light theme, blue accents, generic cards
**Required Changes:**
1. Background: `bg-surface`
2. Cards: `bg-surface-container-high/50 backdrop-blur-heavy` (no borders)
3. List items: Use `bg-surface-container` for rows, shift to `bg-surface-container-high` on hover
4. Search input: `bg-surface-container-low border border-outline-variant/20`
5. Status badges: 
   - Active: `bg-primary/20 text-primary`
   - Expired: `bg-secondary/20 text-secondary`
   - Expiring: `bg-tertiary/20 text-tertiary`
6. Action buttons: Electric Lime primary with `rounded-kinetic`
7. Font: `font-inter-tight tracking-tighter` for headings

**Buttons to Update:**
- Delete button: Secondary Orange (`bg-secondary/20 hover:bg-secondary/30`)
- Edit button: Tertiary Cyan
- View button: Primary Electric Lime

---

### TODO: Add Member (`members/new/page.js`)
**Current State:** Light form builder
**Required Changes:**
1. Container: `bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic`
2. Form labels: `text-xs font-bold uppercase tracking-widest text-on-surface-variant`
3. Form inputs: `bg-surface-container-low border border-outline-variant/20 rounded-kinetic`
4. Submit button: `bg-primary text-black font-black italic rounded-kinetic`
5. Error messages: `bg-secondary/20 text-secondary border border-secondary/30`
6. Field groups: Use vertical space instead of borders

---

### TODO: Member Detail (`members/[id]/page.js`)
**Current State:** Gray background with colored badges
**Required Changes:**
1. Background: `bg-surface`
2. Profile card: `bg-surface-container-high/50 backdrop-blur-heavy`
3. Stats grid: Individual glass cards in 4-column layout
4. Tabs: Active tab uses `border-b-2 border-primary`
5. Attendance history: Table with `bg-surface-container` rows, no border lines
6. Charts: Dark theme with Electric Lime bars
7. Action buttons: Primary/Secondary/Tertiary color scheme

---

### TODO: Attendance (`attendance/page.js`)
**Current State:** White cards with blue buttons
**Required Changes:**
1. Date picker: `bg-surface-container-low rounded-kinetic`
2. Member list items: 
   - Container: `bg-surface-container hover:bg-surface-container-high`
   - No border-b dividers, use bg shifts
   - Number label: Small gray text
3. Status badges:
   - Present: `bg-primary/20 text-primary`
   - Absent: `bg-secondary/20 text-secondary`
4. Control buttons:
   - Present: Primary Electric Lime
   - Absent: Secondary Orange
5. Results message:
   - Success: Green tint (use `bg-primary/10`)
   - Error: Use secondary Orange
6. QR scanner: Dark container with `bg-surface-container-high/50`

---

### TODO: Payments (`payments/page.js`)
**Current State:** Generic table layout
**Required Changes:**
1. Payment form: Glassmorphic with dark inputs
2. Payment list: Use `bg-surface-container` rows, alternating opacity
3. Status badges: Color-coded by payment status
4. Amount display: Use `text-primary` for positive amounts
5. Buttons: Primary Electric Lime for record/submit

---

### TODO: Progress (`progress/page.js`)
**Current State:** Charts on white background
**Required Changes:**
1. Background: `bg-surface`
2. Chart containers: `bg-surface-container-high/50 backdrop-blur-heavy`
3. Recharts styling:
   - CartesianGrid: `stroke="#262626"` (dark)
   - XAxis/YAxis: `tick={{ fill: "#adaaaa" }}`
   - Bar color: Use `fill="#cafd00"` (Electric Lime)
   - Tooltip: `contentStyle={{ backgroundColor: "#131313", border: "1px solid #262626" }}`

---

## 🎨 Color Reference for All Pages

### Background Layers (No Borders - Use Shifts)
```
bg-surface                    → #0e0e0e (page background)
bg-surface-container-low      → #131313 (input backgrounds)
bg-surface-container          → #1c1c1c (row backgrounds)
bg-surface-container-high     → #262626 (card backgrounds)
bg-surface-bright             → #3a3a3a (high elevation)
```

### Text Colors
```
text-on-surface               → #ffffff (headings, primary text)
text-on-surface-variant       → #adaaaa (secondary text, labels)
```

### Accents
```
text-primary                  → #cafd00 (Electric Lime - CTAs)
text-secondary                → #ff7439 (Neon Orange - alerts)
text-tertiary                 → #8ff5ff (Cyber Cyan - recovery)
```

### Component Styling

**All Cards:**
```
className="bg-surface-container-high/50 backdrop-blur-heavy rounded-kinetic border border-outline-variant/10"
```

**All Buttons:**
```
<!-- Primary -->
className="bg-primary hover:bg-primary-light text-black font-black rounded-kinetic"

<!-- Secondary -->
className="bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-kinetic"

<!-- Ghost -->
className="border border-outline-variant/30 rounded-kinetic text-on-surface hover:bg-surface-container-high"
```

**All Inputs:**
```
className="bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-on-surface focus:border-primary"
```

**Status Badges:**
```
<!-- Active/Present -->
className="bg-primary/20 text-primary rounded-kinetic px-2 py-1 text-xs font-bold"

<!-- Inactive/Absent -->
className="bg-secondary/20 text-secondary rounded-kinetic px-2 py-1 text-xs font-bold"

<!-- Expiring -->
className="bg-tertiary/20 text-tertiary rounded-kinetic px-2 py-1 text-xs font-bold"
```

---

## 📐 Typography Rules

### Headers
```
className="font-inter-tight font-black italic tracking-tighter"
- h1: text-5xl md:text-7xl
- h2: text-2xl md:text-4xl
- h3: text-lg md:text-2xl
```

### Body
```
className="font-inter text-sm text-on-surface"
```

### Labels
```
className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
```

---

## 🚀 Implementation Quick Checklist

### For Each Page:

- [ ] Replace all `bg-white` with `bg-surface-container-high/50 backdrop-blur-heavy`
- [ ] Replace all `bg-gray-*` with `bg-surface-container-*`
- [ ] Remove all `border border-gray-*` lines (use bg shifts instead)
- [ ] Update button classes to use primary/secondary color scheme
- [ ] Change typography to `font-inter-tight tracking-tighter` for headings
- [ ] Add `rounded-kinetic` (10px) to all rounded elements
- [ ] Update input backgrounds to `bg-surface-container-low`
- [ ] Change table rows to use `bg-surface-container` with no borders
- [ ] Update charts to dark theme colors
- [ ] Test mobile responsiveness with new glassmorphic elements

---

## 🔍 Verification Steps

1. **Color Accuracy:**
   - Copy hex from design and verify in Tailwind config
   - Electric Lime references should be `#cafd00`
   - Deep Carbon background should be `#0e0e0e`

2. **No Borders Rule:**
   - Use browser dev tools to check computed styles
   - Should see NO `1px solid` borders
   - Separation should come from `background-color` shifts only

3. **Glassmorphism:**
   - All cards should have `backdrop-blur-20px`
   - Cards should show content behind them slightly
   - Opacity should be 50% (`/50` in Tailwind)

4. **Typography:**
   - All headers use `Inter Tight`
   - Inter Tight has `tracking-tighter` applied
   - All uppercase labels have `tracking-widest`

5. **Buttons:**
   - All buttons have `rounded-kinetic` (10px minimum)
   - All buttons have hover states defined
   - All buttons are high-contrast with clear focus states

---

## 📚 Reference Files

- **Design System:** DESIGN.md
- **Reference Implementation:** code.html
- **Tailwind Config:** tailwind.config.js
- **Example Pages:** dashboard/page.js, login/page.js

---

**Last Updated:** April 6, 2026
**Design System:** Kinetic Pulse v1.0
**Framework:** Next.js 16.2.2 + Tailwind CSS v4
