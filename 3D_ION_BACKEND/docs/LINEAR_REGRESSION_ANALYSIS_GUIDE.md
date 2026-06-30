# 📊 Linear Regression Analysis Implementation Guide

**Status:** ✅ Complete Implementation
**Version:** 1.0
**Last Updated:** May 6, 2026

---

## 🎯 Overview

This document describes the complete implementation of the Linear Regression Analysis feature for Infill (%) vs Hounsfield Units (HU) in the AMRAD platform.

### What's Implemented

- ✅ Backend service for regression analysis
- ✅ RESTful API endpoints with filters
- ✅ Frontend interactive regression chart component
- ✅ Analysis page with dynamic filters
- ✅ Data export functionality (CSV/JSON)
- ✅ Statistical calculations and validation
- ✅ Integration with experiments page

---

## 📁 File Structure

### Backend Implementation

```
AMRAD_BACKEND/
├── app/
│   ├── services/
│   │   └── infill_hu_regression_service.py     # ✨ NEW: Service for regression analysis
│   └── routers/
│       └── analysis.py                         # ✨ NEW: API endpoints
├── tests/
│   └── test_infill_hu_regression.py           # ✨ NEW: Comprehensive test suite
└── main.py                                      # UPDATED: Added analysis router
```

### Frontend Implementation

```
AMRAD_FRONTEND/
├── app/
│   └── analise-regressao/
│       └── page.tsx                           # ✨ NEW: Full analysis page
├── src/
│   └── components/
│       └── experiments/
│           └── charts/
│               └── InfillHURegressionChart.tsx # ✨ NEW: Regression chart component
└── app/experimentos/
    └── page.tsx                                # UPDATED: Added analysis link
```

---

## 🔧 Backend Architecture

### Service: `InfillHURegressionService`

**Purpose:** Core business logic for regression analysis

**Key Methods:**

```python
# Fetch data
fetch_infill_hu_data(
    material_id: Optional[str],
    pattern_type: Optional[str],
    machine_id: Optional[str]
) -> pd.DataFrame

# Compute single regression
compute_linear_regression(df: pd.DataFrame) -> Dict

# Group and analyze
group_and_compute_regressions(
    df: pd.DataFrame,
    group_by: List[str]
) -> List[Dict]

# Main pipeline
analyze_infill_hu(
    material_id: Optional[str],
    pattern_type: Optional[str],
    machine_id: Optional[str],
    group_by: List[str]
) -> Dict

# Get available filters
get_available_filters() -> Dict[str, List]
```

### API Endpoints

#### 1. **Get Regression Analysis**
```
GET /api/analysis/infill-hu
```

**Query Parameters:**
- `material_id` (optional): UUID of material
- `pattern_type` (optional): Pattern name (e.g., "Rectilinear")
- `machine_id` (optional): UUID of machine
- `group_by` (optional): Grouping columns (default: "material,pattern")

**Response:**
```json
{
  "groups": [
    {
      "label": "PLA - Rectilinear",
      "group_values": {
        "material_model": "PLA",
        "pattern_type": "Rectilinear"
      },
      "points": [
        {"x": 60, "y": -370},
        {"x": 80, "y": -181}
      ],
      "regression": {
        "a": 9.98,
        "b": -972,
        "r2": 0.999,
        "p_value": 0.001,
        "std_err": 0.05,
        "num_points": 10,
        "x_min": 60,
        "x_max": 100,
        "y_min": -370,
        "y_max": 30
      },
      "point_count": 10
    }
  ],
  "overall_regression": {...},
  "metadata": {
    "total_points": 50,
    "total_groups": 5,
    "filters": {...}
  }
}
```

#### 2. **Get Available Filters**
```
GET /api/analysis/filters
```

**Response:**
```json
{
  "materials": [
    {"id": "uuid", "label": "PLA - Basic"},
    {"id": "uuid", "label": "PETG - Standard"}
  ],
  "patterns": ["Rectilinear", "Grid", "Honeycomb"],
  "machines": [
    {"id": "uuid", "label": "Prusa - i3"},
    {"id": "uuid", "label": "Ultimaker - 3"}
  ]
}
```

#### 3. **Export Data**
```
GET /api/analysis/infill-hu/export?format=csv|json
```

**Query Parameters:**
- `format`: "csv" or "json"
- `material_id`, `pattern_type`, `machine_id`: Same filters as main endpoint

**Response:**
- CSV: Raw CSV file download
- JSON: Structured data with record count

---

## 🎨 Frontend Architecture

### Component: `InfillHURegressionChart`

**Props:**
```typescript
interface InfillHURegressionChartProps {
  groups: RegressionGroup[]
  overallRegression?: RegressionStats
  metadata?: {
    total_points: number
    total_groups: number
    x_axis_label?: string
    y_axis_label?: string
  }
  isLoading?: boolean
  showEquation?: boolean
  showR2?: boolean
  showRegressionLine?: boolean
  colors?: string[]
}
```

**Features:**
- Scatter plot with multiple groups
- Regression lines for each group
- Interactive tooltips
- Expandable statistics cards
- Color-coded groups (8 colors in palette)
- Display options toggle

### Page: `AnalysisPage` (`/analise-regressao`)

**Features:**
- Dynamic filter UI (Material, Pattern, Machine)
- Display options (Show Equation, Show R², Show Regression Line)
- Export functionality (CSV/JSON)
- Real-time data loading
- Responsive design
- Comprehensive interpretation guide

---

## 🧮 Mathematical Implementation

### Regression Model

**Formula:** `HU = a × Infill(%) + b`

Where:
- `a` = Slope (coefficient angular)
- `b` = Intercept (coefficient linear)
- `R²` = Coefficient of determination
- `p-value` = Statistical significance

### Implementation Details

```python
from scipy import stats

def compute_linear_regression(x_values, y_values):
    slope, intercept, r_value, p_value, std_err = stats.linregress(x_values, y_values)
    
    return {
        "a": float(slope),
        "b": float(intercept),
        "r2": float(r_value ** 2),
        "p_value": float(p_value),
        "std_err": float(std_err),
        "num_points": len(x_values),
        "x_min": float(x_values.min()),
        "x_max": float(x_values.max()),
        "y_min": float(y_values.min()),
        "y_max": float(y_values.max())
    }
```

### Data Grouping Strategy

Default grouping by:
1. **Material Model** (from materials table)
2. **Pattern Type** (from infill_measurements)

Custom grouping available via `group_by` parameter.

---

## 📦 Data Flow

### Backend Flow

```
1. User requests /api/analysis/infill-hu with filters
   ↓
2. Service fetches data from Supabase with joins:
   - infill_measurements
   - samples
   - materials
   - machines
   ↓
3. Data is transformed into DataFrame
   ↓
4. Data is grouped by specified columns
   ↓
5. For each group, linear regression is computed
   ↓
6. Results are formatted and returned to frontend
```

### Frontend Flow

```
1. User navigates to /analise-regressao
   ↓
2. Available filters are loaded (GET /api/analysis/filters)
   ↓
3. User selects filters and/or display options
   ↓
4. Initial analysis data is loaded (GET /api/analysis/infill-hu)
   ↓
5. InfillHURegressionChart renders:
   - Scatter plot with all data points
   - Regression lines for each group
   - Statistics cards
   ↓
6. User can:
   - Toggle display options
   - Change filters
   - Export data (CSV/JSON)
```

---

## 🔒 Security & Authentication

All endpoints require authentication via JWT token.

**Security Features:**
- `get_current_user()` dependency ensures user is authenticated
- Supabase service role bypasses RLS (Row Level Security) in backend
- Frontend uses JWT stored in localStorage

**Required for Testing:**
```python
# Include in headers for API calls
headers = {
    "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

---

## ✅ Testing Guide

### Run Backend Tests

```bash
cd AMRAD_BACKEND

# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/test_infill_hu_regression.py -v

# Run specific test
pytest tests/test_infill_hu_regression.py::TestInfillHURegressionAPI::test_get_infill_hu_analysis_no_filters -v
```

### Test Coverage

- ✅ Basic analysis without filters
- ✅ Filtering by material
- ✅ Filtering by pattern
- ✅ Filtering by machine
- ✅ Multiple filters combined
- ✅ Available filters endpoint
- ✅ CSV export
- ✅ JSON export
- ✅ Regression statistics validity
- ✅ Empty filter results
- ✅ Mathematical accuracy

### Manual Testing Checklist

**Backend:**
- [ ] Verify API endpoints are accessible
- [ ] Test all filter combinations
- [ ] Verify regression calculations accuracy
- [ ] Test export functionality
- [ ] Check error handling for edge cases

**Frontend:**
- [ ] Analysis page loads correctly
- [ ] Filters update chart in real-time
- [ ] Display options toggle work properly
- [ ] Tooltip shows correct information
- [ ] Statistics cards expand/collapse correctly
- [ ] Export buttons work (CSV/JSON)
- [ ] Responsive design on mobile
- [ ] Integration with experiments page works

---

## 🐛 Troubleshooting

### Issue: No data displayed

**Possible causes:**
1. Database doesn't have infill_measurements data
2. User doesn't have permission to view data
3. Filters are too restrictive

**Solution:**
- Check database for sample data
- Verify user authentication
- Try removing filters

### Issue: API returns 500 error

**Possible causes:**
1. Service is not properly registered in main.py
2. Missing dependencies (pandas, scipy)
3. Database connection issue

**Solution:**
```bash
# Verify imports in main.py
# Install dependencies
pip install pandas scipy

# Check database connection
# Review error logs
```

### Issue: Chart doesn't render

**Possible causes:**
1. Recharts version incompatibility
2. Data format issue
3. Component import error

**Solution:**
- Verify Recharts version in package.json
- Check console for JavaScript errors
- Verify data structure matches props interface

---

## 📈 Performance Considerations

### Optimization Implemented

1. **Caching:**
   - Filter options are cached on component mount
   - Results are cached per filter combination (via React Query potential)

2. **Data Processing:**
   - Pandas DataFrame for efficient data manipulation
   - Numpy for mathematical operations
   - Vectorized operations instead of loops

3. **Network:**
   - Gzip compression on backend responses
   - Only required fields are fetched from database

### Scalability

**For large datasets:**
- Consider pre-aggregation of infill measurements
- Implement pagination for export
- Add result caching with TTL

---

## 🚀 Future Enhancements (V2)

### Planned Features

- [ ] **Inverse Prediction**
  - Input HU value → get expected infill %
  - Display per material prediction range

- [ ] **Tissue Range Overlay**
  - Horizontal lines for tissue HU ranges
  - Visual context for biological interpretation

- [ ] **Multi-Material Comparison**
  - Side-by-side regression analysis
  - Comparative statistics

- [ ] **Non-linear Regression**
  - Polynomial fit (quadratic, cubic)
  - Exponential models

- [ ] **Machine Learning Integration**
  - Predictive models based on material+pattern
  - Anomaly detection

- [ ] **Advanced Export**
  - PDF reports with charts and analysis
  - Interactive HTML reports

---

## 📋 Maintenance Checklist

### Regular Tasks

- [ ] Monitor API performance
- [ ] Check database query performance
- [ ] Review error logs monthly
- [ ] Update dependencies quarterly
- [ ] Backup test data regularly

### Monitoring

```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/api/v1/analysis/filters

# Monitor database queries
# (Check Supabase dashboard)

# Check frontend performance
# (Use browser DevTools)
```

---

## 📚 References

### Related Documentation

- [Regression Analysis Theory](https://en.wikipedia.org/wiki/Linear_regression)
- [Hounsfield Units](https://en.wikipedia.org/wiki/Hounsfield_scale)
- [Scipy Stats LinRegress](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html)
- [Recharts Documentation](https://recharts.org/)

### Database Schema

See `/memories/repo/estrutura_banco_dados.md` for complete database structure.

---

## ✨ Credits & Version History

**v1.0 - May 6, 2026**
- Initial implementation of linear regression analysis feature
- Backend service and API endpoints
- Frontend interactive chart and analysis page
- Test suite and documentation

---

## 📞 Support

For questions or issues:
1. Check troubleshooting section above
2. Review test cases for usage examples
3. Check application logs for errors
4. Contact development team

---

**Feature Complete** ✅
