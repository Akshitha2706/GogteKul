import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Search, Star, User, Users, Clock, X, ChevronLeft, ChevronRight, Calendar, MapPin, Plus, Bell, Gift, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';

export default function GogteEventsPage() {
  const { t } = useTranslation();
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [memberDirectory, setMemberDirectory] = useState(new Map());
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);
  const [newEventData, setNewEventData] = useState({
    eventName: '',
    eventType: '',
    fromDate: '',
    toDate: '',
    fromTime: '',
    toTime: '',
    priority: 'Medium',
    description: '',
    venue: '',
    venueStreet: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    address: '',
    visibleToAllVansh: true,
    visibleVanshNumbers: '',
    eventImage: null,
    eventImagePreview: null
  });
  const [calendarView, setCalendarView] = useState('monthly');
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const scrollerRef = useRef(null);
  const [familyCelebrations, setFamilyCelebrations] = useState({ birthdays: [], anniversaries: [] });
  const [isFetchingCelebrations, setIsFetchingCelebrations] = useState(false);

  const normalizeText = (value) => (value === undefined || value === null ? '' : String(value).trim());
  const hasLocationValue = (value) => normalizeText(value).length > 0;

  const resolveEventImageSource = (value) => {
    if (!value) {
      return null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || null;
    }
    if (typeof value === 'object') {
      if (typeof value.dataUrl === 'string') {
        const trimmed = value.dataUrl.trim();
        if (trimmed) {
          return trimmed;
        }
      }
      const direct = normalizeText(value.url || value.imageUrl);
      if (direct) {
        return direct;
      }
      if (typeof value.data === 'string' && value.data) {
        const type = normalizeText(value.mimetype) || 'image/png';
        return `data:${type};base64,${value.data}`;
      }
    }
    return null;
  };

  const normalizeEventRecord = (event) => {
    if (!event) {
      return null;
    }
    const normalized = {
      ...event,
      id: event._id || event.id,
      eventName: event.title || event.eventName || 'Untitled Event',
      eventImage: resolveEventImageSource(event.eventImage || event.image || event.imageUrl || event.eventImageUrl),
      fromDate: event.fromDate || event.date,
      toDate: event.toDate || event.date,
      venueStreet: event.venueStreet || '',
      city: event.city || '',
      state: event.state || '',
      pincode: event.pincode || '',
      country: event.country || event.locationCountry || '',
    };

    if (normalized.createdByName && normalized.createdByName.trim() === '') {
      normalized.createdByName = null;
    }

    if (normalized.createdBySerNo !== undefined && normalized.createdBySerNo !== null) {
      const lookupKey = normalized.createdBySerNo;
      if (memberDirectory.has(lookupKey)) {
        normalized.createdByName = memberDirectory.get(lookupKey);
      } else {
        const stringKey = String(lookupKey);
        if (memberDirectory.has(stringKey)) {
          normalized.createdByName = memberDirectory.get(stringKey);
        }
      }
    }

    return normalized;
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchCelebrations = async () => {
      setIsFetchingCelebrations(true);
      try {
        const response = await fetch('/api/members/celebrations');
        if (!response.ok) {
          throw new Error('Failed to load celebrations');
        }
        const data = await response.json();
        if (isMounted) {
          setFamilyCelebrations({
            birthdays: Array.isArray(data?.birthdays) ? data.birthdays : [],
            anniversaries: Array.isArray(data?.anniversaries) ? data.anniversaries : [],
          });
        }
      } catch (error) {
        if (isMounted) {
          setFamilyCelebrations({ birthdays: [], anniversaries: [] });
        }
      } finally {
        if (isMounted) {
          setIsFetchingCelebrations(false);
        }
      }
    };

    const fetchEvents = async () => {
      setIsFetchingEvents(true);
      try {
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error('Failed to load events');
        }
        const data = await response.json();
        if (isMounted) {
          // Backend returns data in data.data array
          const eventsList = Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.events)
            ? data.events
            : [];

          const normalizedEvents = eventsList
            .map((event) => normalizeEventRecord(event))
            .filter(Boolean);

          setEvents(normalizedEvents);

          const directory = new Map();
          normalizedEvents.forEach((event) => {
            if (!event) return;
            if (event.createdBySerNo !== undefined && event.createdBySerNo !== null && event.createdByName) {
              directory.set(event.createdBySerNo, event.createdByName);
              directory.set(String(event.createdBySerNo), event.createdByName);
            }
          });
          setMemberDirectory(directory);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        if (isMounted) {
          setEvents([]);
        }
      } finally {
        if (isMounted) {
          setIsFetchingEvents(false);
        }
      }
    };

    fetchCelebrations();
    fetchEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  const celebrationHighlights = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const windowLimit = new Date(now);
    windowLimit.setDate(now.getDate() + 7);

    const parseCelebrations = (entries, category) => {
      if (!Array.isArray(entries)) {
        return [];
      }
      return entries
        .map((entry) => {
          const dateValue = entry?.date || entry?.eventDate || entry?.celebrationDate;
          const date = dateValue ? new Date(dateValue) : null;
          if (!date || Number.isNaN(date.getTime())) {
            return null;
          }
          const normalizedDate = new Date(date);
          normalizedDate.setHours(0, 0, 0, 0);
          return { ...entry, category, date: normalizedDate };
        })
        .filter(Boolean)
        .filter((entry) => entry.date >= now && entry.date <= windowLimit);
    };

    const combined = [
      ...parseCelebrations(familyCelebrations.birthdays, 'birthday'),
      ...parseCelebrations(familyCelebrations.anniversaries, 'anniversary'),
    ];

    return combined.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 6);
  }, [familyCelebrations]);

  const eventTypes = [
    { value: 'all', label: 'All' },
    { value: 'Birthday', label: 'Birthday' },
    { value: 'Anniversary', label: 'Anniversary' },
    { value: 'Wedding', label: 'Wedding' },
    { value: 'Festival', label: 'Festival' },
    { value: 'Reunion', label: 'Reunion' },
    { value: 'Memorial', label: 'Memorial' },
    { value: 'Cultural', label: 'Cultural' },
    { value: 'Religious', label: 'Religious' },
    { value: 'Other', label: 'Other' }
  ];

  const priorities = [
    { value: 'all', label: 'All' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' }
  ];

  const monthOptions = [
    { value: 'all', label: 'All' },
    { value: '0', label: 'Jan' },
    { value: '1', label: 'Feb' },
    { value: '2', label: 'Mar' },
    { value: '3', label: 'Apr' },
    { value: '4', label: 'May' },
    { value: '5', label: 'Jun' },
    { value: '6', label: 'Jul' },
    { value: '7', label: 'Aug' },
    { value: '8', label: 'Sep' },
    { value: '9', label: 'Oct' },
    { value: '10', label: 'Nov' },
    { value: '11', label: 'Dec' }
  ];

  const getEventTypeLabel = (value) => {
    const entry = eventTypes.find((item) => item.value === value);
    return entry ? entry.label : value || 'Event';
  };

  const getPriorityLabel = (value) => {
    const entry = priorities.find((item) => item.value === value);
    return entry ? entry.label : priorities[priorities.length - 1].label;
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleDateString();
  };

  const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleString();
  };

  const formatLocationDetails = (event) => {
    if (!event) return '';
    const parts = [event.venueStreet, event.city, event.state, event.pincode, event.country]
      .map((part) => normalizeText(part))
      .filter(Boolean);
    return parts.join(', ');
  };

  const detailLocationSummary = selectedEvent ? formatLocationDetails(selectedEvent) : '';
  const detailLocationItems = selectedEvent
    ? [
        { label: 'Street', value: selectedEvent.venueStreet },
        { label: 'City', value: selectedEvent.city },
        { label: 'State', value: selectedEvent.state },
        { label: 'Pincode', value: selectedEvent.pincode },
        { label: 'Country', value: selectedEvent.country },
        { label: 'Address', value: selectedEvent.address }
      ].filter((entry) => hasLocationValue(entry.value))
    : [];
  const venueDisplay = selectedEvent
    ? hasLocationValue(selectedEvent.venue)
      ? selectedEvent.venue
      : hasLocationValue(detailLocationSummary)
      ? detailLocationSummary
      : hasLocationValue(selectedEvent?.address)
      ? selectedEvent.address
      : 'TBD'
    : 'TBD';

  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      // Exclude auto-generated events from "All Events" section
      if (item.isAutoGenerated) {
        return false;
      }

      const matchesEventType = selectedEventType === 'all' || item.eventType === selectedEventType;
      const matchesPriority = selectedPriority === 'all' || item.priority === selectedPriority;

      let matchesMonth = true;
      if (selectedMonth !== 'all') {
        // Use fromDate, fallback to date for backward compatibility
        const eventDateValue = item.fromDate || item.date;
        const date = new Date(eventDateValue);
        matchesMonth = !Number.isNaN(date.getTime()) && date.getMonth() === Number(selectedMonth);
      }

      const matchesSearch = [
        item.eventName,
        item.description,
        item.venue,
        item.address,
        item.venueStreet,
        item.city,
        item.state,
        item.pincode,
        item.country
      ].some((value) => String(value || '').toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesEventType && matchesPriority && matchesMonth && matchesSearch;
    });
  }, [selectedEventType, selectedPriority, selectedMonth, searchTerm, events]);

  const featuredEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter events that are still active (toDate hasn't passed yet)
    const upcomingEvents = events.filter((item) => {
      if (item.isAutoGenerated) {
        return false;
      }
      // Use toDate if available, otherwise use fromDate or date
      const eventEndDate = item.toDate ? new Date(item.toDate) : (item.fromDate ? new Date(item.fromDate) : new Date(item.date));
      eventEndDate.setHours(23, 59, 59, 999); // Set to end of the day
      return eventEndDate >= today;
    });

    // Sort by most recent fromDate first, then by priority (high > medium > low)
    const combined = [...upcomingEvents].sort((a, b) => {
      const aFromDate = new Date(a.fromDate || a.date).getTime();
      const bFromDate = new Date(b.fromDate || b.date).getTime();
      
      // Sort by date descending (most recent first)
      if (aFromDate !== bFromDate) {
        return aFromDate - bFromDate; // Earlier dates first (ascending)
      }

      // If same date, sort by priority (High > Medium > Low)
      const priorityOrder = { 'High': 0, 'high': 0, 'Medium': 1, 'medium': 1, 'Low': 2, 'low': 2 };
      const aPriority = priorityOrder[a.priority] ?? 999;
      const bPriority = priorityOrder[b.priority] ?? 999;
      return aPriority - bPriority;
    });
    return combined.slice(0, 8);
  }, [events]);

  const analyticsMetrics = (() => {
    const monthCounts = {};
    const typeCounts = {};
    let upcomingInWeek = 0;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const weekAhead = new Date(now);
    weekAhead.setDate(now.getDate() + 7);

    events.forEach((item) => {
      // Only count user-created events in analytics (exclude auto-generated)
      if (item.isAutoGenerated) {
        return;
      }

      // Use fromDate, fallback to date for backward compatibility
      const eventDateValue = item.fromDate || item.date;
      const date = new Date(eventDateValue);
      if (!Number.isNaN(date.getTime())) {
        const monthIndex = date.getMonth();
        monthCounts[monthIndex] = (monthCounts[monthIndex] || 0) + 1;
        
        // Check if event starts within the week and is still active (toDate hasn't passed)
        const eventEndDate = item.toDate ? new Date(item.toDate) : date;
        eventEndDate.setHours(23, 59, 59, 999);
        if (date >= now && date <= weekAhead && eventEndDate >= now) {
          upcomingInWeek += 1;
        }
      }

      const typeKey = item.eventType || 'Other';
      typeCounts[typeKey] = (typeCounts[typeKey] || 0) + 1;
    });

    const topMonthEntry = Object.entries(monthCounts).reduce((top, [month, count]) => {
      if (!top || count > top.count || (count === top.count && Number(month) < top.month)) {
        return { month: Number(month), count };
      }
      return top;
    }, null);

    const topTypeEntry = Object.entries(typeCounts).reduce((top, [typeKey, count]) => {
      if (!top || count > top.count) {
        return { typeKey, count };
      }
      return top;
    }, null);

    const mostCelebratedMonth = topMonthEntry
      ? (monthOptions.find((option) => option.value === String(topMonthEntry.month))?.label || 'N/A')
      : 'N/A';

    const mostCommonType = topTypeEntry ? getEventTypeLabel(topTypeEntry.typeKey) : 'N/A';

    return {
      totalEvents: events.length,
      mostCelebratedMonth,
      mostCommonType,
      upcomingInWeek,
    };
  })();

  const handleEventClick = (event) => {
    const normalized = normalizeEventRecord(event);
    if (normalized) {
      if (normalized.createdBySerNo !== undefined && normalized.createdBySerNo !== null && normalized.createdByName) {
        memberDirectory.set(normalized.createdBySerNo, normalized.createdByName);
        memberDirectory.set(String(normalized.createdBySerNo), normalized.createdByName);
      }
      setSelectedEvent(normalized);
      setShowDetailModal(true);
    }
  };

  const scroll = (direction) => {
    if (scrollerRef.current) {
      const scrollAmount = 400;
      scrollerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleNewEventChange = (field) => (value) => {
    const nextValue = value?.target ? value.target.value : value;
    setNewEventData((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEventData((prev) => ({
          ...prev,
          eventImage: file,
          eventImagePreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setNewEventData((prev) => ({
      ...prev,
      eventImage: null,
      eventImagePreview: null
    }));
  };

  const handleCreateEvent = async (event) => {
    event.preventDefault();
    
    if (!newEventData.eventName || !newEventData.eventType || !newEventData.fromDate) {
      alert('Please fill in all required fields: Event Name, Type, and From Date');
      return;
    }

    if (newEventData.toDate && newEventData.toDate < newEventData.fromDate) {
      alert('To Date must be equal to or after From Date');
      return;
    }

    setIsSavingEvent(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to create events');
        setIsSavingEvent(false);
        return;
      }

      const derivedAddressParts = [
        newEventData.venueStreet,
        newEventData.city,
        newEventData.state,
        newEventData.pincode,
        newEventData.country
      ].map((part) => (part ? String(part).trim() : '')).filter(Boolean);
      const normalizedAddress = newEventData.address || derivedAddressParts.join(', ');

      // Create FormData to handle image upload
      const formData = new FormData();
      formData.append('title', newEventData.eventName);
      formData.append('eventType', newEventData.eventType);
      formData.append('fromDate', newEventData.fromDate);
      formData.append('toDate', newEventData.toDate || newEventData.fromDate);
      formData.append('fromTime', newEventData.fromTime);
      formData.append('toTime', newEventData.toTime);
      formData.append('priority', newEventData.priority);
      formData.append('description', newEventData.description);
      formData.append('venue', newEventData.venue);
      formData.append('venueStreet', newEventData.venueStreet);
      formData.append('city', newEventData.city);
      formData.append('state', newEventData.state);
      formData.append('pincode', newEventData.pincode);
      formData.append('country', newEventData.country);
      formData.append('address', normalizedAddress);
      formData.append('visibleToAllVansh', newEventData.visibleToAllVansh);
      formData.append('visibleVanshNumbers', newEventData.visibleVanshNumbers);
      formData.append('visibilityOption', newEventData.visibleToAllVansh ? 'all' : 'specific');
      
      if (newEventData.eventImage) {
        formData.append('eventImage', newEventData.eventImage);
      }

      // Debug logging
      console.log('Submitting event with data:');
      console.log('title:', newEventData.eventName);
      console.log('eventType:', newEventData.eventType);
      console.log('fromDate:', newEventData.fromDate);
      console.log('FormData entries:');
      for (let pair of formData.entries()) {
        console.log(`  ${pair[0]}:`, pair[1]);
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to create event');
      }

      // Refresh events list
      const eventsResponse = await fetch('/api/events');
      if (eventsResponse.ok) {
        const data = await eventsResponse.json();
        // Backend returns data in data.data array
        const eventsList = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.events)
          ? data.events
          : [];
        
        // Normalize events to include eventImage as dataUrl
        const normalizedEvents = eventsList
          .map((event) => normalizeEventRecord(event))
          .filter(Boolean);
        
        setEvents(normalizedEvents);
      }

      setShowAddEventModal(false);
      setNewEventData({
        eventName: '',
        eventType: '',
        fromDate: '',
        toDate: '',
        fromTime: '',
        toTime: '',
        priority: 'Medium',
        description: '',
        venue: '',
        venueStreet: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        address: '',
        visibleToAllVansh: true,
        visibleVanshNumbers: '',
        eventImage: null,
        eventImagePreview: null
      });
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error creating event: ' + error.message);
    } finally {
      setIsSavingEvent(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-orange-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-amber-800 mb-2">Family Events</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAddEventModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-5 h-5" />
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none bg-white"
              >
                {eventTypes.map((eventType) => (
                  <option key={eventType.value} value={eventType.value}>
                    {eventType.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-5 h-5" />
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none bg-white"
              >
                {priorities.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-5 h-5" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none bg-white"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Featured Events Scroller */}
        {featuredEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-amber-800">Trending & Upcoming Events</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => scroll('left')}
                  className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scroll('right')}
                  className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div
              ref={scrollerRef}
              className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
              style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
            >
              {featuredEvents.map((event) => {
                const locationLabel = formatLocationDetails(event) || event.venue || event.address || 'TBD';
                return (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="flex-shrink-0 w-64 bg-white rounded-lg shadow-md border border-orange-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300"
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                          {event.eventType || 'Event'}
                        </span>
                        {event.priority && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${
                            event.priority?.toLowerCase() === 'high'
                              ? 'bg-red-600'
                              : event.priority?.toLowerCase() === 'medium'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          }`}>
                            {event.priority}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-amber-800 mb-1 line-clamp-2">
                        {event.eventName}
                      </h3>
                      {event.description && (
                        <p className="text-amber-700 text-xs mb-3 line-clamp-1">
                          {event.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-amber-600">
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {locationLabel}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(event.fromDate || event.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-amber-600" />
              <div>
                <h2 className="text-2xl font-bold text-amber-800">Upcoming Events</h2>
                <p className="text-amber-600 text-sm">Stay alerted for birthdays, anniversaries, and ceremonies.</p>
              </div>
            </div>
            <span className="text-xs uppercase tracking-wide text-amber-500 font-semibold">
              {isFetchingCelebrations ? 'Refreshing...' : 'Updated'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isFetchingCelebrations && celebrationHighlights.length === 0 && (
              <div className="border border-dashed border-amber-300 rounded-xl p-6 bg-amber-50 text-center text-amber-600 text-sm">
                Loading upcoming celebrations...
              </div>
            )}
            {!isFetchingCelebrations && celebrationHighlights.length === 0 && (
              <div className="border border-dashed border-amber-300 rounded-xl p-6 bg-amber-50 text-center text-amber-600 text-sm">
                No upcoming birthdays or anniversaries in the next 7 days.
              </div>
            )}
            {celebrationHighlights.map((item, index) => {
              const IconComponent = item.category === 'birthday' ? Gift : item.category === 'anniversary' ? Heart : Bell;
              const baseName = item?.name || item?.title || item?.fullName || 'Family Member';
              const isAnniversary = item.category === 'anniversary';
              const coupleName = isAnniversary && item.name ? item.name : baseName;
              const subtitle = isAnniversary
                ? item.primaryName && item.spouseName
                  ? `Wedding anniversary is coming up for ${item.primaryName} and ${item.spouseName}.`
                  : 'Wedding anniversary is coming up.'
                : item.category
                  ? item.category.charAt(0).toUpperCase() + item.category.slice(1)
                  : 'Celebration';
              const statusLabel = isAnniversary
                ? Number.isFinite(item.yearsMarried)
                  ? `${item.yearsMarried} Years`
                  : 'Anniversary'
                : 'Upcoming';
              return (
                <div key={index} className="border border-amber-200 rounded-xl p-4 bg-gradient-to-br from-amber-50 to-orange-100 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <IconComponent className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">{coupleName}</p>
                      <p className={`text-xs text-amber-600 ${isAnniversary ? '' : 'capitalize'}`}>{subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-amber-700">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(item.date)}
                    </span>
                    <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">{statusLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between mt-10 mb-4">
          <h2 className="text-2xl font-bold text-amber-800">All Events</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => {
              const dateLabel = formatDate(event.date);
              const timeDisplay = event.time || 'To be announced';
              const locationSummary = formatLocationDetails(event) || event.venue || event.address || 'Venue TBD';

              return (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300 flex flex-col"
                >
                  {event.eventImage && (
                    <div className="relative h-40 bg-gradient-to-br from-amber-100 to-orange-200 overflow-hidden">
                      <img
                        src={event.eventImage}
                        alt={event.eventName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-6 flex flex-col gap-4 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {event.eventType || 'Event'}
                      </span>
                      {event.priority && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                          event.priority?.toLowerCase() === 'high'
                            ? 'bg-red-600'
                            : event.priority?.toLowerCase() === 'medium'
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}>
                          {event.priority}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-amber-800 mb-2 line-clamp-2">
                        {event.eventName}
                      </h3>
                      {event.description && (
                        <p className="text-amber-700 text-sm line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 text-sm text-amber-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {dateLabel || 'Date to be announced'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {timeDisplay}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {event.venue || 'Venue TBD'}
                      </div>
                    </div>

                    <div className="mt-auto pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                        className="w-full inline-flex justify-center items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-1 md:col-span-2 xl:col-span-3 bg-white rounded-xl shadow-sm border border-orange-200 p-12 text-center">
              <div className="text-amber-500 mb-4">
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-amber-800 mb-2">No events found</h3>
              <p className="text-amber-700">No events match your search criteria. Try a different filter or search term.</p>
            </div>
          )}
        </div>

      </div>

      {/* Event Detail Modal */}
      {showDetailModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-orange-200">
              <h2 className="text-2xl font-bold text-amber-800">Event Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-amber-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-amber-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <h1 className="text-3xl font-bold text-amber-800">{selectedEvent.eventName}</h1>
                  {selectedEvent.createdByName && (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
                      <User className="w-4 h-4" />
                      Posted by {selectedEvent.createdByName}
                    </span>
                  )}
                </div>

                {/* Date and Time Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <span className="flex items-center gap-2 text-blue-800">
                      <Calendar className="w-5 h-5" />
                      <div>
                        <strong>From Date:</strong> {formatDate(selectedEvent.fromDate || selectedEvent.date)}
                      </div>
                    </span>
                    {selectedEvent.toDate && selectedEvent.toDate !== selectedEvent.fromDate && (
                      <span className="flex items-center gap-2 text-blue-800">
                        <Calendar className="w-5 h-5" />
                        <div>
                          <strong>To Date:</strong> {formatDate(selectedEvent.toDate)}
                        </div>
                      </span>
                    )}
                    {selectedEvent.fromTime && (
                      <span className="flex items-center gap-2 text-blue-800">
                        <Clock className="w-5 h-5" />
                        <div>
                          <strong>From Time:</strong> {selectedEvent.fromTime}
                        </div>
                      </span>
                    )}
                    {selectedEvent.toTime && (
                      <span className="flex items-center gap-2 text-blue-800">
                        <Clock className="w-5 h-5" />
                        <div>
                          <strong>To Time:</strong> {selectedEvent.toTime}
                        </div>
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <span className="flex items-center gap-2 text-amber-700">
                    <MapPin className="w-5 h-5" />
                    <strong>Venue:</strong> {venueDisplay}
                  </span>
                  {selectedEvent?.priority && (
                    <span className="flex items-center gap-2 text-amber-700">
                      <Star className="w-5 h-5" />
                      <strong>Priority:</strong> {selectedEvent.priority}
                    </span>
                  )}
                </div>

                {detailLocationItems.length > 0 && (
                  <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {detailLocationItems.map((item, index) => (
                      <span key={index} className="text-sm text-amber-700">
                        <strong>{item.label}:</strong> {item.value}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-amber-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    {selectedEvent.eventType || 'Event'}
                  </span>
                </div>
              </div>

              {selectedEvent.description && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-amber-800 mb-3">Description</h3>
                  <p className="text-amber-700 leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.visibleVanshNumbers && selectedEvent.visibleVanshNumbers.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Visible to Vanshes:</strong> {selectedEvent.visibleVanshNumbers.join(', ')}
                  </p>
                </div>
              )}
              {selectedEvent.visibleToAllVansh && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    <strong>✓ Visible to All Vanshes</strong>
                  </p>
                </div>
              )}

              {selectedEvent.eventImage && (
                <div className="mt-6 rounded-lg overflow-hidden border border-orange-200">
                  <img
                    src={selectedEvent.eventImage}
                    alt={selectedEvent.eventName}
                    className="w-full h-80 object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-orange-200">
              <h2 className="text-2xl font-bold text-amber-800">Add New Event</h2>
              <button
                onClick={() => setShowAddEventModal(false)}
                className="p-2 hover:bg-amber-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-amber-600" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              {/* Event Name */}
              <div>
                <label className="block text-sm font-semibold text-amber-700 mb-1">Event Name *</label>
                <input
                  value={newEventData.eventName}
                  onChange={handleNewEventChange('eventName')}
                  placeholder="Enter event name"
                  className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-semibold text-amber-700 mb-1">Event Type *</label>
                <select
                  value={newEventData.eventType}
                  onChange={handleNewEventChange('eventType')}
                  className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select event type</option>
                  {eventTypes.filter((item) => item.value !== 'all').map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* From Date & To Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-amber-700 mb-1">From Date *</label>
                  <input
                    type="date"
                    value={newEventData.fromDate}
                    onChange={handleNewEventChange('fromDate')}
                    className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-700 mb-1">To Date (Optional)</label>
                  <input
                    type="date"
                    value={newEventData.toDate}
                    onChange={handleNewEventChange('toDate')}
                    min={newEventData.fromDate}
                    className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* From Time & To Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-amber-700 mb-1">From Time (Optional)</label>
                  <input
                    type="time"
                    value={newEventData.fromTime}
                    onChange={handleNewEventChange('fromTime')}
                    className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-700 mb-1">To Time (Optional)</label>
                  <input
                    type="time"
                    value={newEventData.toTime}
                    onChange={handleNewEventChange('toTime')}
                    className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-amber-700 mb-1">Priority</label>
                <select
                  value={newEventData.priority}
                  onChange={handleNewEventChange('priority')}
                  className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Venue & Location */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-amber-700 mb-1">Venue Name</label>
                    <input
                      value={newEventData.venue}
                      onChange={handleNewEventChange('venue')}
                      placeholder="Enter venue name"
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-amber-700 mb-1">Venue Street</label>
                    <input
                      value={newEventData.venueStreet}
                      onChange={handleNewEventChange('venueStreet')}
                      placeholder="Street address"
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-amber-700 mb-1">City</label>
                    <input
                      value={newEventData.city}
                      onChange={handleNewEventChange('city')}
                      placeholder="City"
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-amber-700 mb-1">State</label>
                    <input
                      value={newEventData.state}
                      onChange={handleNewEventChange('state')}
                      placeholder="State"
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-amber-700 mb-1">Pincode</label>
                    <input
                      value={newEventData.pincode}
                      onChange={handleNewEventChange('pincode')}
                      placeholder="Postal code"
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-amber-700 mb-1">Country</label>
                    <input
                      value={newEventData.country}
                      onChange={handleNewEventChange('country')}
                      placeholder="Country"
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-700 mb-1">Address (Optional)</label>
                  <input
                    value={newEventData.address}
                    onChange={handleNewEventChange('address')}
                    placeholder="Apartment, landmark, or additional details"
                    className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-amber-700 mb-1">Description</label>
                <textarea
                  value={newEventData.description}
                  onChange={handleNewEventChange('description')}
                  rows="3"
                  placeholder="Enter event details"
                  className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              {/* Event Image Upload */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                <label className="block text-sm font-semibold text-purple-800 mb-3">Event Image (Optional)</label>
                
                {newEventData.eventImagePreview ? (
                  <div className="relative mb-4">
                    <img 
                      src={newEventData.eventImagePreview} 
                      alt="Event preview" 
                      className="w-full h-48 object-cover rounded-lg border border-purple-200"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-purple-50 hover:bg-purple-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 text-purple-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <p className="text-sm text-purple-700">Click to upload image</p>
                        <p className="text-xs text-purple-500">(JPG, PNG, GIF up to 5MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Vansh Visibility */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-semibold text-blue-800 mb-3">Event Visibility - Vansh</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="visibleToAllVansh"
                      checked={newEventData.visibleToAllVansh}
                      onChange={(e) => {
                        setNewEventData((prev) => ({
                          ...prev,
                          visibleToAllVansh: e.target.checked,
                          visibleVanshNumbers: e.target.checked ? '' : prev.visibleVanshNumbers
                        }));
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="visibleToAllVansh" className="text-sm text-blue-700 cursor-pointer">
                      Select All Vanshes
                    </label>
                  </div>

                  {!newEventData.visibleToAllVansh && (
                    <div>
                      <label className="block text-xs text-blue-700 mb-1">
                        Or enter specific Vansh numbers (comma-separated, e.g.: 1, 2, 5)
                      </label>
                      <input
                        type="text"
                        value={newEventData.visibleVanshNumbers}
                        onChange={handleNewEventChange('visibleVanshNumbers')}
                        placeholder="e.g., 1, 2, 3"
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 bg-white border border-orange-200 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                  disabled={isSavingEvent}
                >
                  {isSavingEvent ? 'Saving...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}