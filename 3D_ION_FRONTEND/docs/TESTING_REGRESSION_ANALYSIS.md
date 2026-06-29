# 🎨 Frontend Testing Guide - Linear Regression Analysis

**Component:** InfillHURegressionChart + AnalysisPage
**Status:** ✅ Ready for Testing
**Last Updated:** May 6, 2026

---

## 🧪 Manual Testing Scenarios

### Scenario 1: Basic Chart Rendering

**Steps:**
1. Navigate to `/analise-regressao`
2. Wait for page to load
3. Observe default data loading with all filters removed

**Expected Results:**
- [ ] Page loads without errors
- [ ] "Carregando análise de regressão..." spinner appears briefly
- [ ] Chart renders with scatter points
- [ ] Regression lines visible for each group
- [ ] Statistics cards below chart
- [ ] Overall statistics panel at bottom

---

### Scenario 2: Filter by Material

**Steps:**
1. In filter section, select a material from "Material" dropdown
2. Click "Atualizar" button
3. Wait for chart to reload

**Expected Results:**
- [ ] Chart updates with filtered data
- [ ] Only data for selected material is shown
- [ ] Number of groups may decrease
- [ ] Statistics update accordingly
- [ ] URL query params reflect selected material
- [ ] Filter shows in "Filtros aplicados"

---

### Scenario 3: Filter by Pattern

**Steps:**
1. Select a pattern from "Padrão de Preenchimento" dropdown
2. Click "Atualizar" button

**Expected Results:**
- [ ] Chart updates with only selected pattern data
- [ ] Group labels show only that pattern
- [ ] Data points filtered correctly
- [ ] Regression equations update

---

### Scenario 4: Multiple Filters

**Steps:**
1. Select Material: "PLA"
2. Select Pattern: "Rectilinear"
3. Select Machine: "Prusa i3"
4. Click "Atualizar"

**Expected Results:**
- [ ] Chart shows intersection of all three filters
- [ ] Data is correctly filtered (may show very few points)
- [ ] All filter values displayed in metadata

---

### Scenario 5: Toggle Display Options

**Steps:**
1. Toggle "Mostrar Equação" checkbox
2. Click on a statistics card to expand it

**Expected Results:**
- [ ] When toggled OFF: Equations disappear from expanded cards
- [ ] When toggled ON: Equations reappear
- [ ] Same behavior for "Mostrar R²" and "Mostrar Linha de Regressão"

---

### Scenario 6: Expand Statistics Card

**Steps:**
1. Click on a group statistics card (left side of card)
2. Wait for expansion animation

**Expected Results:**
- [ ] Card expands with smooth animation
- [ ] Shows regression equation: HU = a × Infill + b
- [ ] Shows R², p-value, slope, intercept, std error, N
- [ ] Shows X and Y ranges
- [ ] Clicking again collapses the card
- [ ] Only one card can be expanded at a time (optional)

---

### Scenario 7: Tooltip Interaction

**Steps:**
1. Hover over a data point in the scatter plot
2. Move mouse across chart

**Expected Results:**
- [ ] Tooltip appears on hover
- [ ] Shows infill percentage and HU value
- [ ] Tooltip follows mouse
- [ ] Disappears when mouse leaves data point
- [ ] Tooltip style is consistent with design

---

### Scenario 8: Export CSV

**Steps:**
1. Click "Exportar CSV" button
2. Check browser downloads folder

**Expected Results:**
- [ ] Download starts automatically
- [ ] Filename is "infill_hu_regression.csv"
- [ ] File contains valid CSV data
- [ ] Headers: infill_pct, hu_mean, pattern_type, material_brand, etc.
- [ ] Each row represents one measurement

---

### Scenario 9: Export JSON

**Steps:**
1. Click "Exportar JSON" button
2. Check browser downloads folder
3. Open file in text editor

**Expected Results:**
- [ ] Download starts automatically
- [ ] Filename is "infill_hu_regression.json"
- [ ] File contains valid JSON
- [ ] Structure matches expected format
- [ ] Can be parsed and used programmatically

---

### Scenario 10: Empty Results

**Steps:**
1. Filter by Material: Select a material with no data
2. Filter by Pattern: Enter "NonExistentPattern"
3. Click "Atualizar"

**Expected Results:**
- [ ] Chart shows empty state message
- [ ] Message says "Nenhum dado disponível para análise"
- [ ] Export buttons are disabled
- [ ] No errors in console
- [ ] Page remains responsive

---

### Scenario 11: Error Handling

**Steps:**
1. Disconnect network
2. Try to load analysis
3. Reconnect network
4. Try again

**Expected Results:**
- [ ] Error message appears at top of page
- [ ] Error is user-friendly (in Portuguese)
- [ ] No JavaScript console errors
- [ ] Page remains usable (can change filters)
- [ ] Retry works after network restored

---

### Scenario 12: Responsive Design - Mobile

**Steps:**
1. Open page on mobile device (or use browser DevTools)
2. Set viewport to 375px width (mobile)
3. Scroll through page
4. Test all interactions

**Expected Results:**
- [ ] Filter selects stack vertically (1 column)
- [ ] Chart height appropriate for mobile
- [ ] Statistics cards are readable
- [ ] Buttons are touchable (min 44px height)
- [ ] No horizontal scroll needed
- [ ] Legend is readable

---

### Scenario 13: Responsive Design - Tablet

**Steps:**
1. Set viewport to 768px width
2. Test layout

**Expected Results:**
- [ ] Filters show in 2 columns
- [ ] Chart is proportional
- [ ] Statistics cards in 2 columns

---

### Scenario 14: Responsive Design - Desktop

**Steps:**
1. Set viewport to 1920px width

**Expected Results:**
- [ ] Filters show in 4 columns (optimized layout)
- [ ] Chart large and clear
- [ ] Statistics cards in 2-4 columns

---

### Scenario 15: Performance Test

**Steps:**
1. Open browser DevTools (F12)
2. Go to Performance tab
3. Start recording
4. Load analysis page
5. Stop recording
6. Check metrics

**Expected Results:**
- [ ] Initial load time < 3 seconds
- [ ] Chart renders in < 500ms
- [ ] Filter interaction is responsive (< 200ms)
- [ ] No memory leaks
- [ ] No unnecessary re-renders

---

## 🔍 Visual Regression Testing

### Chart Appearance

- [ ] Scatter points are clearly visible
- [ ] Regression lines are distinct from data points
- [ ] Colors are distinct between groups (8 color palette)
- [ ] Axis labels are readable
- [ ] Grid is subtle but visible
- [ ] Tooltip styling matches design system

### Page Layout

- [ ] Header section properly sized
- [ ] Filter section has proper spacing
- [ ] Chart section takes appropriate space
- [ ] Statistics cards have consistent sizing
- [ ] Bottom section (interpretation guide) is readable
- [ ] All text is readable (contrast ratio > 4.5:1)

---

## 🚀 Performance Metrics

### Target Metrics

- **First Contentful Paint (FCP):** < 1.5s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Cumulative Layout Shift (CLS):** < 0.1
- **Time to Interactive (TTI):** < 3.5s

### Measuring Performance

```bash
# Using Lighthouse in DevTools
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run audit for "Performance"
4. Check metrics
```

---

## 🐛 Known Issues & Workarounds

### Issue: Chart doesn't update when filters change

**Status:** Not expected with current implementation
**If it occurs:**
1. Check browser console for errors
2. Verify API is responding
3. Try refreshing page
4. Clear browser cache

---

### Issue: Export buttons are disabled

**Cause:** No data loaded or data is empty
**Solution:**
1. Remove filters to get all data
2. Verify database has infill_measurements
3. Check browser console for network errors

---

### Issue: Tooltip not showing

**Cause:** Possible Recharts configuration issue
**Workaround:**
1. Hover over different points
2. Zoom in if points are very close
3. Check if multiple points at same location

---

## ✅ Acceptance Criteria

### Must Have (P0)

- [ ] Chart displays scatter plot with regression lines
- [ ] All four filters work correctly (Material, Pattern, Machine, refresh)
- [ ] Statistics cards show correct regression values (a, b, R², p-value)
- [ ] Data can be exported as CSV
- [ ] Data can be exported as JSON
- [ ] Page responsive on mobile, tablet, desktop
- [ ] No JavaScript console errors
- [ ] Authentication required (user logged in)
- [ ] Link from experiments page works

### Should Have (P1)

- [ ] Display options toggles work correctly
- [ ] Tooltip shows on hover with correct data
- [ ] Statistics cards expand/collapse smoothly
- [ ] Overall statistics panel visible
- [ ] Interpretation guide helpful
- [ ] Empty state message when no data
- [ ] Error messages are user-friendly

### Nice to Have (P2)

- [ ] Smooth animations
- [ ] Color-coded groups with legend
- [ ] Print-friendly styling
- [ ] Keyboard navigation (Tab through filters)
- [ ] Tooltip shows additional context

---

## 📱 Browser Compatibility

### Required Support

- [ ] Chrome/Chromium 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Edge 90+

### Mobile Support

- [ ] iOS Safari 14+
- [ ] Android Chrome 90+

---

## 🎬 Test Execution Log

### Test Session: [DATE]

**Tester:** ___________________
**Browser/Device:** ___________________
**Duration:** ___________________

**Results:**

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Basic Rendering | ☐ Pass ☐ Fail | |
| 2. Filter Material | ☐ Pass ☐ Fail | |
| 3. Filter Pattern | ☐ Pass ☐ Fail | |
| 4. Multiple Filters | ☐ Pass ☐ Fail | |
| 5. Toggle Options | ☐ Pass ☐ Fail | |
| 6. Expand Cards | ☐ Pass ☐ Fail | |
| 7. Tooltip | ☐ Pass ☐ Fail | |
| 8. Export CSV | ☐ Pass ☐ Fail | |
| 9. Export JSON | ☐ Pass ☐ Fail | |
| 10. Empty Results | ☐ Pass ☐ Fail | |
| 11. Error Handling | ☐ Pass ☐ Fail | |
| 12-14. Responsive | ☐ Pass ☐ Fail | |
| 15. Performance | ☐ Pass ☐ Fail | |

**Issues Found:**

1. Issue: ___________________
   Severity: ☐ Critical ☐ High ☐ Medium ☐ Low
   Steps to reproduce: ___________________

2. Issue: ___________________
   Severity: ☐ Critical ☐ High ☐ Medium ☐ Low
   Steps to reproduce: ___________________

**Overall Status:** ☐ Ready for Release ☐ Needs Fixes

**Sign Off:** ___________________ Date: ___________________

---

## 🔗 Integration Checklist

- [ ] Analysis component works standalone
- [ ] Analysis page loads from route
- [ ] Link in experiments page navigates correctly
- [ ] Authentication checks work
- [ ] Backend API endpoints return correct data
- [ ] Frontend data transformation is correct
- [ ] No conflicts with existing features
- [ ] Documentation is complete

---

## 📊 Test Coverage Goals

- **Unit Tests:** 80%+
- **Integration Tests:** 70%+
- **E2E Tests:** Main flows covered
- **Manual Testing:** All scenarios

---

## 🚀 Release Checklist

Before releasing to production:

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation complete
- [ ] Performance metrics acceptable
- [ ] Security review done
- [ ] No console errors
- [ ] Database migrations applied
- [ ] Rollback plan documented

---

**Last Tested:** ___________
**Ready for Release:** ☐ Yes ☐ No
