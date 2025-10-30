# Upcoming Events Sorting & Date Range Logic

## Overview
This document describes the enhanced logic for displaying upcoming events with proper date range handling and sorting priorities.

---

## Key Changes

### 1. **Upcoming Events Filtering**

**Location**: `frontend/src/pages/GogteEvents.js` - `featuredEvents` useMemo (lines 223-267)

**Logic**:
- Events are included in "Upcoming Events" if their **toDate hasn't passed**
- If `toDate` is provided, it determines when the event ends
- If `toDate` is not provided, it defaults to `fromDate`
- The event remains visible throughout its entire duration (fromDate → toDate)

**Example**:
```
Event: Family Reunion
fromDate: 2024-06-15
toDate: 2024-06-16

Today: 2024-06-15 at 10:00 AM
Status: ✅ VISIBLE in Upcoming Events

Today: 2024-06-16 at 11:59 PM
Status: ✅ VISIBLE in Upcoming Events

Today: 2024-06-17 at 12:01 AM
Status: ❌ NO LONGER in Upcoming Events (toDate has passed)
```

### 2. **Event Sorting Order**

**Primary Sort**: By **fromDate** (Chronological - Soonest First)
**Secondary Sort**: By **Priority** (High → Medium → Low)

**Implementation**:
```javascript
// Sort logic
1. Compare fromDate values
   - Earlier dates come first (ascending order)
   - This shows the most immediate/nearest upcoming events first

2. For events on the same date:
   - High priority events display first
   - Then Medium priority
   - Then Low priority
```

**Example Sorting**:
```
1. Wedding (Jun 12) - High Priority    ← Soonest date, highest priority
2. Birthday (Jun 12) - Medium Priority  ← Same date, lower priority
3. Festival (Jun 15) - High Priority   ← Later date, higher priority
4. Reunion (Jun 18) - Low Priority     ← Latest date
```

### 3. **Events with Date Ranges**

**Multi-day Events**:
- Event shows from `fromDate` through `toDate`
- Not limited to just the start date
- Remains in upcoming until the end date passes

**Example**:
```
Event: Annual Family Gathering
fromDate: 2024-07-01
toDate: 2024-07-05

Visible in Upcoming Events for entire period:
- Jul 1, 2, 3, 4, 5 (all days the event is active)

Hidden after:
- Jul 6 (toDate 23:59:59 has passed)
```

---

## Frontend Implementation Details

### Fetch Events Function
**File**: `frontend/src/pages/GogteEvents.js` (lines 68-96)

```javascript
const fetchEvents = async () => {
  const response = await fetch('/api/events');
  const data = await response.json();
  
  // Normalize events with date fields
  const normalizedEvents = eventsList.map(event => ({
    ...event,
    eventImage: event.eventImage?.dataUrl || null,
    fromDate: event.fromDate || event.date,    // Backward compatible
    toDate: event.toDate || event.date,        // Defaults to fromDate
  }));
};
```

### Featured Events Logic
**File**: `frontend/src/pages/GogteEvents.js` (lines 223-267)

**Steps**:
1. Get today's date at 00:00:00
2. Filter events where toDate end-of-day (23:59:59) >= today
3. Sort by fromDate ascending (nearest first)
4. Then by priority descending (high > medium > low)
5. Return first 8 events for carousel display

**Code**:
```javascript
const featuredEvents = useMemo(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter: Only show if toDate hasn't passed
  const upcomingEvents = events.filter((item) => {
    const eventEndDate = item.toDate ? new Date(item.toDate) : new Date(item.fromDate);
    eventEndDate.setHours(23, 59, 59, 999);
    return eventEndDate >= today;
  });

  // Sort: By date first, then priority
  return upcomingEvents.sort((a, b) => {
    const aFromDate = new Date(a.fromDate).getTime();
    const bFromDate = new Date(b.fromDate).getTime();
    
    // Sort by fromDate ascending
    if (aFromDate !== bFromDate) {
      return aFromDate - bFromDate;
    }

    // Same date: sort by priority (High=0, Medium=1, Low=2)
    const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  }).slice(0, 8);
}, [events]);
```

### Analytics Update
**File**: `frontend/src/pages/GogteEvents.js` (lines 269-303)

The analytics now:
- Uses `fromDate` for month counting
- Checks both start date and active status for "upcoming in week" calculation
- Verifies `toDate` hasn't passed before counting as upcoming

---

## Backend Support

### Event Data Structure
```javascript
{
  _id: ObjectId,
  title: String,
  fromDate: Date,          // Event start (ISO format)
  toDate: Date,            // Event end (ISO format)
  fromTime: String,        // Optional: HH:MM format
  toTime: String,          // Optional: HH:MM format
  priority: String,        // "high", "medium", "low"
  eventType: String,
  description: String,
  eventImage: Object,      // {dataUrl, filename, size}
  createdAt: Date,
  updatedAt: Date
}
```

### API Endpoints

**GET /api/events**
- Returns all events sorted by fromDate descending (newest first)
- Frontend re-sorts for upcoming carousel

**GET /api/events/range/search**
- Query: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- Returns events overlapping the date range

---

## User Experience Flow

### Scenario: Multi-day Event Creation

**User Creates**:
```
Title: "Family Reunion"
From Date: June 15, 2024
To Date: June 16, 2024
Priority: High
```

**Visible Dates**:
- June 15, 2024: ✅ Shows in Upcoming
- June 16, 2024: ✅ Shows in Upcoming
- June 17, 2024: ❌ Hidden (toDate passed)

### Scenario: Priority-based Sorting

**Events for Same Date (June 20)**:
1. ✅ High Priority Event (shows first)
2. Medium Priority Event (shows second)
3. Low Priority Event (shows third)

**Events for Different Dates**:
1. ✅ June 15 (High Priority) - Soonest date
2. June 20 (High Priority) - Later date
3. June 25 (Low Priority) - Latest date

---

## Testing Checklist

- [ ] Event shows from `fromDate` through entire `toDate`
- [ ] Event disappears after `toDate` 23:59:59 passes
- [ ] Sorting shows soonest date first
- [ ] Same-date events sort by priority (high → medium → low)
- [ ] Multi-day events display correctly in carousel
- [ ] Images load from dataUrl
- [ ] Analytics counts correct upcoming events
- [ ] Filter by month uses fromDate correctly
- [ ] Search includes all event text fields

---

## Date Format Details

### Frontend
- Input: Date picker returns `YYYY-MM-DD` format
- Storage: Converted to JavaScript Date objects
- Display: Uses `.toLocaleDateString()` for formatting

### Backend
- Storage: ISO 8601 format (e.g., `2024-06-15T00:00:00.000Z`)
- Comparison: Uses MongoDB date operators
- Response: Returned as ISO strings, converted to dataUrl for images

### Time Handling
- `fromTime`/`toTime`: Stored as `HH:MM` strings
- Example: `"14:30"` for 2:30 PM
- Optional fields: Can be empty strings if not specified

---

## Performance Considerations

### Sorting Optimization
- Sorting happens in `useMemo` - recalculates only when events array changes
- Shows only first 8 events in carousel (memory efficient)
- No database query needed for sorting (done in frontend)

### Date Filtering
- Simple date comparison (O(n) complexity)
- Cached via useMemo for re-render performance
- No nested date calculations

---

## Backward Compatibility

Events created with old single `date` field:
- Fallback: `fromDate || date`
- Fallback: `toDate || date`
- Ensures old events continue to display correctly

---

## Migration Notes

### For Existing Events
If migrating from old single-date format:
```javascript
// Old format
{ date: "2024-06-15", ... }

// New format (auto-converted)
{ fromDate: "2024-06-15", toDate: "2024-06-15", ... }
```

---

**Status**: ✅ Complete and Ready for Testing

**Last Updated**: 2024