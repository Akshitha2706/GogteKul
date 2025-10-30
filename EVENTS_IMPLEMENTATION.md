# Event Date Range, Time Intervals, and Image Upload Implementation

## Overview
This document outlines the complete implementation of enhanced event features including date ranges, time intervals, and optional image uploads for the GogteEvents feature.

---

## Backend Implementation

### Event API Endpoints

All endpoints are located in `backend/server.js` (lines 1805-2126)

#### 1. **POST /api/events** - Create Event
- **Accepts**: FormData with file upload
- **Fields**:
  - `title` (required): Event title
  - `description` (optional): Event description
  - `eventType` (optional): Type of event (defaults to "General")
  - `fromDate` (required): Event start date (YYYY-MM-DD)
  - `toDate` (optional): Event end date (defaults to fromDate)
  - `fromTime` (optional): Event start time (HH:MM)
  - `toTime` (optional): Event end time (HH:MM)
  - `priority` (optional): Event priority - "low", "medium", "high" (defaults to "low")
  - `eventImage` (optional): Image file (JPG, PNG, GIF up to 5MB)

**Response**:
```json
{
  "success": true,
  "message": "Event created successfully",
  "id": "ObjectId",
  "data": {
    "_id": "ObjectId",
    "title": "string",
    "description": "string",
    "eventType": "string",
    "fromDate": "ISO date",
    "toDate": "ISO date",
    "fromTime": "string",
    "toTime": "string",
    "priority": "string",
    "eventImage": { "filename": "string", "size": "number" },
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  }
}
```

#### 2. **GET /api/events** - Get All Events
- **Query Parameters**: None
- **Returns**: Array of all events sorted by fromDate (newest first)
- **Image Data**: Returned as data URLs for direct display

#### 3. **GET /api/events/:id** - Get Single Event
- **URL Parameters**: 
  - `id`: MongoDB ObjectId of the event
- **Returns**: Single event with full details including image data

#### 4. **PUT /api/events/:id** - Update Event
- **Accepts**: FormData with optional file upload
- **URL Parameters**: `id` - MongoDB ObjectId
- **Fields**: All fields are optional; unchanged fields retain original values
- **Image Update**: Pass new `eventImage` file to replace existing image

#### 5. **DELETE /api/events/:id** - Delete Event
- **URL Parameters**: `id` - MongoDB ObjectId
- **Returns**: Success confirmation

#### 6. **GET /api/events/range/search** - Get Events by Date Range
- **Query Parameters**:
  - `startDate`: Start date (YYYY-MM-DD or ISO format)
  - `endDate`: End date (YYYY-MM-DD or ISO format)
- **Returns**: Events that overlap with the specified date range

---

## Database Schema

### Events Collection
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  eventType: String,
  fromDate: Date,
  toDate: Date,
  fromTime: String,        // HH:MM format
  toTime: String,          // HH:MM format
  priority: String,        // "low", "medium", "high"
  eventImage: {
    data: String,          // Base64 encoded image
    mimetype: String,      // e.g., "image/jpeg"
    filename: String,
    size: Number,
    uploadedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## Frontend Implementation

### GogteEvents.js Component

**State Management** (lines 18-52):
- `events`: Array of events
- `showAddModal`: Boolean for modal visibility
- `formData`: Object containing:
  - `title`: Event title
  - `description`: Event description
  - `eventType`: Event type
  - `fromDate`: Start date
  - `toDate`: End date
  - `fromTime`: Start time
  - `toTime`: End time
  - `priority`: Event priority
  - `eventImage`: File object for upload
  - `eventImagePreview`: Data URL for preview

**Key Functions**:
- `handleImageUpload(e)`: Converts selected image to data URL for preview
- `handleRemoveImage()`: Clears image selection
- `handleInputChange(e)`: Updates form fields
- `handleAddEvent()`: Submits event using FormData API
- `fetchEvents()`: Retrieves all events from backend
- `openEventDetails(event)`: Opens detailed event view

**Validation**:
- Validates `fromDate` is required
- Validates `toDate` is >= `fromDate` or empty
- Validates image file size and type

**Form Submission**:
Uses FormData API to properly handle multipart form data with file upload:
```javascript
const formDataObj = new FormData();
formDataObj.append('title', formData.title);
formDataObj.append('description', formData.description);
formDataObj.append('eventType', formData.eventType);
formDataObj.append('fromDate', formData.fromDate);
formDataObj.append('toDate', formData.toDate || formData.fromDate);
formDataObj.append('fromTime', formData.fromTime);
formDataObj.append('toTime', formData.toTime);
formDataObj.append('priority', formData.priority);
if (formData.eventImage) {
  formDataObj.append('eventImage', formData.eventImage);
}
```

### UI Components

**Add Event Modal**:
- Event Type: Full-width dropdown
- Date Range Section: Side-by-side From/To Date pickers
- Time Range Section: Side-by-side From/To Time inputs
- Priority: Full-width dropdown
- Image Upload: Purple-themed drag-and-drop area with:
  - File type guidance (JPG, PNG, GIF up to 5MB)
  - Image preview with remove button
  - Drag-and-drop support

**Event Details Modal**:
- Displays event image at the top
- Blue-themed date/time information
- Conditional display of optional fields

**Featured Events Carousel**:
- Displays event image if available
- Falls back to party emoji if no image

---

## Technical Details

### Image Storage
- Images are stored as Base64-encoded strings in MongoDB
- Returned as data URLs: `data:image/jpeg;base64,...`
- 5MB file size limit enforced by multer middleware
- Supported formats: JPG, PNG, GIF

### Date/Time Handling
- Dates stored as ISO 8601 format in MongoDB
- Default timezone: User's browser timezone for frontend
- Date range queries use MongoDB comparison operators

### Error Handling
- Comprehensive validation on both frontend and backend
- Specific error messages for:
  - Missing required fields
  - Invalid date formats
  - Invalid date ranges (toDate < fromDate)
  - File size exceeded
  - Invalid file types
  - Database errors

### File Upload Middleware
Configuration in `backend/middleware/upload.js`:
- Memory storage (no disk writes)
- File filter: Image files only
- Size limit: 5MB
- Field name: `eventImage`

---

## Usage Examples

### Create Event with Image (Frontend)
```javascript
const formData = new FormData();
formData.append('title', 'Family Reunion');
formData.append('fromDate', '2024-06-15');
formData.append('toDate', '2024-06-16');
formData.append('fromTime', '10:00');
formData.append('toTime', '18:00');
formData.append('eventImage', imageFile);

const response = await fetch('/api/events', {
  method: 'POST',
  body: formData
});
```

### Fetch Events
```javascript
const response = await fetch('/api/events');
const { data: events } = await response.json();
```

### Get Events in Date Range
```javascript
const response = await fetch(
  '/api/events/range/search?startDate=2024-06-01&endDate=2024-06-30'
);
const { data: events } = await response.json();
```

### Update Event
```javascript
const formData = new FormData();
formData.append('title', 'Updated Title');
formData.append('priority', 'high');
// Optionally add new image:
formData.append('eventImage', newImageFile);

const response = await fetch(`/api/events/${eventId}`, {
  method: 'PUT',
  body: formData
});
```

---

## Features Implemented

✅ **Date Ranges**: Events can span multiple days with fromDate and toDate  
✅ **Time Intervals**: Optional fromTime and toTime for specific hour ranges  
✅ **Image Upload**: Optional image upload with preview (JPG, PNG, GIF up to 5MB)  
✅ **Image Display**: Images shown in event details and featured carousel  
✅ **Validation**: Comprehensive validation on frontend and backend  
✅ **Error Handling**: User-friendly error messages  
✅ **Date Range Search**: Query events by date range  
✅ **CRUD Operations**: Full Create, Read, Update, Delete support  

---

## Next Steps (Optional Enhancements)

- [ ] Add image cropping functionality
- [ ] Implement event reminders/notifications
- [ ] Add recurring events support
- [ ] Event attendee management
- [ ] Event search and filtering by type/priority
- [ ] Calendar view integration
- [ ] Add event comments/discussions

---

## Testing Endpoints

Using curl or Postman:

```bash
# Create event with image
curl -X POST http://localhost:4000/api/events \
  -F "title=Test Event" \
  -F "fromDate=2024-06-15" \
  -F "toDate=2024-06-16" \
  -F "fromTime=10:00" \
  -F "toTime=18:00" \
  -F "priority=high" \
  -F "eventImage=@/path/to/image.jpg"

# Get all events
curl http://localhost:4000/api/events

# Get specific event
curl http://localhost:4000/api/events/[event_id]

# Get events by date range
curl "http://localhost:4000/api/events/range/search?startDate=2024-06-01&endDate=2024-06-30"
```

---

## Environment Configuration

No additional environment variables needed. The implementation uses:
- Existing MongoDB connection from `MONGODB_URI`
- Existing multer upload middleware from `backend/middleware/upload.js`
- Express.js with CORS enabled

---

**Status**: ✅ Complete - Ready for testing and deployment