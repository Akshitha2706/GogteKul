# Events Feature - Quick Reference Guide

## 📋 What's New?

### Enhanced Event System with:
✅ **Date Ranges** - Events can span multiple days (fromDate → toDate)  
✅ **Time Intervals** - Optional specific times (fromTime → toTime)  
✅ **Image Upload** - Optional event images (JPG, PNG, GIF up to 5MB)  
✅ **Smart Sorting** - Soonest events first, then by priority  
✅ **Active Duration** - Events show until toDate passes  

---

## 🎯 Key Rules

### 1. **When Events Appear**
```
✅ VISIBLE: Today ≤ toDate 23:59:59
❌ HIDDEN: Today > toDate 23:59:59
```

### 2. **Display Order** (in Upcoming Events carousel)
```
1st: Soonest date
2nd: Same date but High Priority
3rd: Same date but Medium Priority
4th: Same date but Low Priority
5th: Later dates follow same pattern
```

### 3. **Date Range Examples**

**Single Day Event** (most common):
```
fromDate: June 15, 2024
toDate: June 15, 2024  (same as fromDate, or leave blank)
→ Shows only on June 15
```

**Multi-Day Event**:
```
fromDate: June 15, 2024
toDate: June 16, 2024
→ Shows on both June 15 AND June 16
→ Hidden on June 17 (toDate passed)
```

**All-Day Festival**:
```
fromDate: July 1, 2024
toDate: July 7, 2024
→ Shows for entire week: Jul 1-7
→ Hidden from July 8 onwards
```

---

## 🔧 Frontend Setup

### File: `GogteEvents.js`

**Event Data Structure**:
```javascript
{
  _id: "MongoDB ID",
  eventName: "Family Reunion",
  fromDate: "2024-06-15T00:00:00.000Z",
  toDate: "2024-06-16T00:00:00.000Z",
  fromTime: "10:00",           // Optional
  toTime: "18:00",             // Optional
  priority: "high",             // "high", "medium", "low"
  eventType: "Reunion",
  description: "Family gathering",
  eventImage: "data:image/jpeg;base64,...",  // Optional
  venue: "Community Center",
  address: "123 Main St",
  ...
}
```

**Creating an Event**:
```javascript
// Form Data
const formData = new FormData();
formData.append('title', 'Family Reunion');
formData.append('fromDate', '2024-06-15');
formData.append('toDate', '2024-06-16');      // Optional, defaults to fromDate
formData.append('fromTime', '10:00');          // Optional
formData.append('toTime', '18:00');            // Optional
formData.append('priority', 'high');
formData.append('eventType', 'Reunion');
formData.append('eventImage', imageFile);      // Optional

// Submit
fetch('/api/events', { method: 'POST', body: formData });
```

**Displaying Events**:
```javascript
// Shows in carousel sorted by:
// 1. Soonest date first
// 2. High priority first (if same date)
// 3. Maximum 8 events in carousel
featuredEvents.map(event => (
  <EventCard 
    image={event.eventImage}
    title={event.eventName}
    date={formatDate(event.fromDate)}
    priority={event.priority}
  />
))
```

---

## 🛠️ Backend Setup

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/events` | Create new event with image |
| GET | `/api/events` | Get all events (sorted ascending by fromDate) |
| GET | `/api/events/:id` | Get single event details |
| PUT | `/api/events/:id` | Update event (with optional new image) |
| DELETE | `/api/events/:id` | Delete event |
| GET | `/api/events/range/search?startDate=X&endDate=Y` | Query by date range |

### Create Event (Request)
```javascript
POST /api/events
Content-Type: multipart/form-data

{
  title: "Family Reunion",
  fromDate: "2024-06-15",
  toDate: "2024-06-16",
  fromTime: "10:00",
  toTime: "18:00",
  priority: "high",
  eventType: "Reunion",
  description: "Annual gathering",
  eventImage: <File>
}
```

### Get All Events (Response)
```javascript
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Family Reunion",
      "fromDate": "2024-06-15T00:00:00.000Z",
      "toDate": "2024-06-16T00:00:00.000Z",
      "priority": "high",
      "eventImage": {
        "dataUrl": "data:image/jpeg;base64,...",
        "filename": "reunion.jpg",
        "size": 245678
      }
    }
  ]
}
```

### Database Schema (MongoDB)
```javascript
db.events.insertOne({
  _id: ObjectId(),
  title: "Family Reunion",
  description: "Annual family gathering",
  eventType: "Reunion",
  fromDate: ISODate("2024-06-15T00:00:00Z"),
  toDate: ISODate("2024-06-16T00:00:00Z"),
  fromTime: "10:00",
  toTime: "18:00",
  priority: "high",
  eventImage: {
    data: "base64string...",
    mimetype: "image/jpeg",
    filename: "reunion.jpg",
    size: 245678,
    uploadedAt: ISODate()
  },
  createdAt: ISODate(),
  updatedAt: ISODate()
})
```

---

## 📊 Sorting Logic (Backend → Frontend)

**Backend** (sorts data leaving DB):
- Ascending by `fromDate` (soonest first)
- Used for consistent data retrieval

**Frontend** (re-sorts for display):
- Filters: Only events where toDate ≥ today
- Primary sort: fromDate ascending (soonest first)
- Secondary sort: Priority (High → Medium → Low)
- Result: First 8 events shown in carousel

---

## 🖼️ Image Handling

### Frontend Upload
```javascript
handleImageUpload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  
  reader.onloadend = () => {
    setNewEventData(prev => ({
      ...prev,
      eventImage: file,
      eventImagePreview: reader.result  // Data URL for preview
    }));
  };
  
  reader.readAsDataURL(file);
}
```

### Image Constraints
- **Max Size**: 5MB (enforced by multer)
- **Formats**: JPG, PNG, GIF
- **Storage**: Base64 encoded in MongoDB
- **Response**: Returned as data URL (`data:image/jpeg;base64,...`)
- **Display**: Direct HTML `<img src={event.eventImage}>`

### Image Display in Carousel
```javascript
{event.eventImage ? (
  <img src={event.eventImage} alt={event.eventName} />
) : (
  <div className="text-4xl">🎉</div>  // Fallback emoji
)}
```

---

## ✅ Testing Checklist

### Event Creation
- [ ] Can create event with date range
- [ ] Can add time range (optional)
- [ ] Can upload image (optional)
- [ ] Image preview shows before submission
- [ ] Form validates date range (toDate ≥ fromDate)

### Event Display
- [ ] Event shows from fromDate through toDate
- [ ] Event disappears after toDate passes
- [ ] Carousel shows soonest events first
- [ ] High priority events sort before medium/low priority
- [ ] Images display correctly in carousel
- [ ] Images display in event details modal

### Sorting
- [ ] Event on June 15 shows before June 20
- [ ] High priority (Jun 20) shows before Low priority (Jun 15)
- [ ] Maximum 8 events in carousel
- [ ] Multiple-day events display correctly

### API
- [ ] POST /api/events creates event
- [ ] GET /api/events returns events (ascending by date)
- [ ] GET /api/events/:id returns single event
- [ ] PUT /api/events/:id updates event
- [ ] DELETE /api/events/:id removes event
- [ ] GET /api/events/range/search filters by dates

---

## 🔍 Debugging Tips

### Event Not Showing?
```javascript
// Check if toDate has passed
const today = new Date();
const eventEndsAt = new Date(event.toDate);
eventEndsAt.setHours(23, 59, 59, 999);

if (eventEndsAt < today) {
  console.log("Event has passed - won't show in upcoming");
}
```

### Wrong Sort Order?
```javascript
// Verify events are sorted by fromDate ascending
events.sort((a, b) => {
  return new Date(a.fromDate) - new Date(b.fromDate);
});

// Then check priority ordering for same dates
if (aFromDate === bFromDate) {
  const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
  return priorityOrder[a.priority] - priorityOrder[b.priority];
}
```

### Image Not Displaying?
```javascript
// Check if backend returned dataUrl
if (!event.eventImage?.dataUrl) {
  console.log("Image not available, using fallback");
}

// Image should be in format:
// "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
```

---

## 📚 File Locations

| File | Purpose |
|------|---------|
| `backend/server.js` | Event API endpoints (lines 1805-2126) |
| `frontend/src/pages/GogteEvents.js` | Event UI & sorting logic |
| `backend/middleware/upload.js` | Image upload configuration |
| `EVENTS_IMPLEMENTATION.md` | Detailed API documentation |
| `UPCOMING_EVENTS_SORTING.md` | Sorting logic deep dive |

---

## 🚀 Deployment

### Environment Variables
No new environment variables needed - uses existing:
- `MONGODB_URI` - Database connection
- `MONGODB_DB` - Database name

### Database Indexes (Recommended)
```javascript
db.events.createIndex({ fromDate: 1 });
db.events.createIndex({ toDate: 1 });
db.events.createIndex({ priority: 1 });
db.events.createIndex({ createdAt: -1 });
```

### Dependencies (Already Installed)
- `express` - API framework
- `multer` - File upload handling
- `mongodb` - Database connection

---

## 📝 Example Workflows

### Workflow 1: Create Single-Day Event
```
User selects:
- Event Name: "Birthday Party"
- From Date: June 25, 2024
- To Date: (leave blank or June 25)
- Priority: Medium
- Image: party.jpg

Result:
→ Appears in "Upcoming Events" on June 25 only
→ Disappears on June 26
```

### Workflow 2: Create Multi-Day Festival
```
User selects:
- Event Name: "Summer Festival"
- From Date: July 1, 2024
- To Date: July 7, 2024
- Priority: High
- Time: 9:00 AM - 10:00 PM daily

Result:
→ Appears for entire week (Jul 1-7)
→ Shows first in carousel (High priority + earliest date)
→ Disappears on July 8
```

### Workflow 3: Update Event Image
```
User clicks "Edit Event"
- Changes image or other details
- Submits with new image file

Result:
→ Old image replaced with new one
→ Event re-fetched and re-sorted
→ Carousel updates automatically
```

---

**Last Updated**: 2024  
**Status**: ✅ Production Ready  
**Version**: 1.0