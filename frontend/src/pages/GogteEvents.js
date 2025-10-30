import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Search, Star, User, Clock, X, ChevronLeft, ChevronRight, Calendar, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';

export default function GogteEventsPage() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const scrollerRef = useRef(null);

  // Sample events data
  const events = [
    {
      id: 1,
      title: 'Annual Family Reunion 2024',
      summary: 'Celebrate together as one big family',
      content: 'Join us for our annual family reunion where members from all over gather to celebrate our heritage and bond with one another. This is a perfect opportunity to meet cousins, share stories, and strengthen our family ties.',
      category: 'reunion',
      categoryLabel: 'Reunion',
      priority: 'High',
      date: new Date(2024, 11, 15),
      eventDate: '2024-12-15',
      startTime: '09:00 AM',
      endTime: '06:00 PM',
      location: 'TBD',
      organizer: 'Gogte Samiti',
      image: null,
      emoji: '👨‍👩‍👧‍👦'
    },
    {
      id: 2,
      title: 'Gogte Samiti Meeting',
      summary: 'Annual Samiti gathering and planning session',
      content: 'Important meeting to discuss the activities, plans, and initiatives for the upcoming year. All committee members and interested family members are welcome to participate and share their views.',
      category: 'meeting',
      categoryLabel: 'Meeting',
      priority: 'Medium',
      date: new Date(2024, 10, 20),
      eventDate: '2024-11-20',
      startTime: '10:00 AM',
      endTime: '02:00 PM',
      location: 'Community Hall',
      organizer: 'Samiti Executive',
      image: null,
      emoji: '📅'
    },
    {
      id: 3,
      title: 'Diwali Celebration',
      summary: 'Festival of lights celebration across all regions',
      content: 'Celebrate Diwali with the Gogte family! This will be a special gathering where we celebrate our cultural values and the festival of lights with traditional rituals, prayers, and social activities.',
      category: 'festival',
      categoryLabel: 'Festival',
      priority: 'High',
      date: new Date(2024, 10, 1),
      eventDate: '2024-11-01',
      startTime: '06:00 PM',
      endTime: '10:00 PM',
      location: 'All regions',
      organizer: 'Regional Coordinators',
      image: null,
      emoji: '🎉'
    },
    {
      id: 4,
      title: 'Youth Achievement Awards',
      summary: 'Honoring young achievers of the community',
      content: 'A prestigious event where we recognize and celebrate the outstanding achievements of our young family members in academics, sports, business, and social service. Join us as we felicitate our rising stars.',
      category: 'achievement',
      categoryLabel: 'Achievement',
      priority: 'High',
      date: new Date(2024, 11, 10),
      eventDate: '2024-12-10',
      startTime: '03:00 PM',
      endTime: '07:00 PM',
      location: 'Main Center',
      organizer: 'Youth Wing',
      image: null,
      emoji: '🏆'
    },
    {
      id: 5,
      title: 'Heritage & Culture Workshop',
      summary: 'Learn about our family heritage and traditions',
      content: 'An interactive workshop where elders of the family share stories, traditions, and the rich heritage of the Gogte family. Participants will learn about our customs, values, and the history that shaped our community.',
      category: 'cultural',
      categoryLabel: 'Cultural',
      priority: 'Medium',
      date: new Date(2024, 10, 25),
      eventDate: '2024-11-25',
      startTime: '02:00 PM',
      endTime: '05:00 PM',
      location: 'Virtual',
      organizer: 'Heritage Committee',
      image: null,
      emoji: '🎭'
    },
    {
      id: 6,
      title: 'Charity & Community Service',
      summary: 'Community service and outreach program',
      content: 'Join us in making a positive impact in society. This event will involve various community service activities including donations, volunteering, and outreach programs to support those in need.',
      category: 'community',
      categoryLabel: 'Community',
      priority: 'Medium',
      date: new Date(2024, 11, 5),
      eventDate: '2024-12-05',
      startTime: '08:00 AM',
      endTime: '12:00 PM',
      location: 'Various locations',
      organizer: 'Social Service Wing',
      image: null,
      emoji: '❤️'
    }
  ];

  const categories = [
    { value: 'all', label: 'All Events' },
    { value: 'reunion', label: 'Reunion' },
    { value: 'festival', label: 'Festival' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'achievement', label: 'Achievement' },
    { value: 'cultural', label: 'Cultural' },
    { value: 'community', label: 'Community' }
  ];

  const priorities = [
    { value: 'all', label: 'All Priorities' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' }
  ];

  const getCategoryLabel = (value) => {
    const entry = categories.find((item) => item.value === value);
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

  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesPriority = selectedPriority === 'all' || item.priority === selectedPriority;
      const matchesSearch = [
        item.title,
        item.summary,
        item.content,
        item.location,
        item.organizer
      ].some((value) => String(value || '').toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesPriority && matchesSearch;
    });
  }, [selectedCategory, selectedPriority, searchTerm]);

  const featuredEvents = useMemo(() => {
    // Get current date and calculate start of current week (Monday)
    const today = new Date();
    const currentDay = today.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // Filter events from current week and future
    const upcomingEvents = events.filter((item) => {
      const itemDate = new Date(item.eventDate || item.date);
      return itemDate >= weekStart;
    });

    // Sort by priority and date
    const combined = [...upcomingEvents].sort((a, b) => {
      const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
      const aPriority = priorityOrder[a.priority] ?? 999;
      const bPriority = priorityOrder[b.priority] ?? 999;
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      const aDate = new Date(a.eventDate || a.date).getTime();
      const bDate = new Date(b.eventDate || b.date).getTime();
      return aDate - bDate;
    });
    return combined.slice(0, 8);
  }, []);

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowDetailModal(true);
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events, location, organizer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none bg-white"
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
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
          </div>
        </div>

        {/* Featured Events Scroller */}
        {featuredEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-amber-800">Upcoming & Featured</h2>
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
              className="flex gap-6 overflow-x-auto pb-4 scroll-smooth"
              style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
            >
              {featuredEvents.map((event, index) => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="flex-shrink-0 w-80 bg-white rounded-xl shadow-md border border-orange-200 overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="p-4 border-b border-orange-100 flex items-center justify-between">
                    <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {event.categoryLabel}
                    </span>
                    {event.priority && (
                      <div className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                        event.priority === 'High' ? 'bg-red-600' : 
                        event.priority === 'Medium' ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}>
                        {event.priority}
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="text-lg font-bold text-amber-800 mb-2 line-clamp-2">
                      {event.title}
                    </h3>
                    {event.summary && (
                      <p className="text-amber-700 mb-3 line-clamp-2 text-sm">
                        {event.summary}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-amber-600">
                      <span className="flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        {event.organizer}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(event.eventDate)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => handleEventClick(event)}
                className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {event.categoryLabel}
                    </span>
                    {event.priority && (
                      <div className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                        event.priority === 'High' ? 'bg-red-600' : 
                        event.priority === 'Medium' ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}>
                        {event.priority}
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-amber-800 mb-2 line-clamp-2">
                    {event.title}
                  </h3>
                  {event.summary && (
                    <p className="text-amber-700 mb-2 line-clamp-2">
                      {event.summary}
                    </p>
                  )}
                  {event.content && (
                    <p className="text-amber-600 mb-4 line-clamp-3 text-sm">
                      {event.content}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-amber-600">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {event.organizer}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDate(event.eventDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 bg-white rounded-xl shadow-sm border border-orange-200 p-12 text-center">
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
                <h1 className="text-3xl font-bold text-amber-800 mb-4">{selectedEvent.title}</h1>

                <div className="flex flex-wrap items-center gap-4 text-amber-600 mb-4">
                  <span className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    <strong>Organizer:</strong> {selectedEvent.organizer}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    <strong>Event Date:</strong> {formatDate(selectedEvent.eventDate)}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    <strong>Time:</strong> {selectedEvent.startTime} - {selectedEvent.endTime}
                  </span>
                  <span className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    <strong>Location:</strong> {selectedEvent.location}
                  </span>
                  {selectedEvent?.priority && (
                    <span className="flex items-center">
                      <Star className="w-5 h-5 mr-2" />
                      <strong>Priority:</strong> {getPriorityLabel(selectedEvent.priority)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-amber-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    {selectedEvent.categoryLabel}
                  </span>
                </div>
              </div>

              {selectedEvent.summary && (
                <div className="mb-6">
                  <p className="text-amber-700 mb-4 text-lg">{selectedEvent.summary}</p>
                </div>
              )}

              {selectedEvent.content && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-amber-800 mb-3">Details</h3>
                  <p className="text-amber-700 leading-relaxed text-lg">{selectedEvent.content}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}