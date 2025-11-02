import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Profile from './Profile';
import {
  Users,
  Newspaper,
  Calendar,
  User,
  TrendingUp,
  Clock,
  Heart,
  GitBranch,

  Sparkles,
  Shield,
  Star
} from 'lucide-react';

const toText = (value) => (typeof value === 'string' ? value.trim() : '');

const formatRelativeDate = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const abs = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;
  if (abs < minute) {
    return 'Just now';
  }
  const label = (count, unit) => `${count} ${unit}${count === 1 ? '' : 's'} ${diff >= 0 ? 'ago' : 'from now'}`;
  if (abs < hour) {
    const count = Math.max(1, Math.floor(abs / minute));
    return label(count, 'minute');
  }
  if (abs < day) {
    const count = Math.max(1, Math.floor(abs / hour));
    return label(count, 'hour');
  }
  if (abs < month) {
    const count = Math.max(1, Math.floor(abs / day));
    return label(count, 'day');
  }
  if (abs < year) {
    const count = Math.max(1, Math.floor(abs / month));
    return label(count, 'month');
  }
  const count = Math.max(1, Math.floor(abs / year));
  return label(count, 'year');
};

const formatEventDate = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};


// Small helper for accent ring without changing primary palette
const Card = ({ children, className = '' }) => (
  <div className={`relative bg-white rounded-2xl shadow-md border border-gray-200 ${className}`}>
    <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
      background: 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(107,114,128,0.15))',
      mask: 'linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)',
      WebkitMask: 'linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)',
      padding: '1px'
    }}></div>
    <div className="relative z-10">{children}</div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({ firstName: 'Guest' });
  const [summary, setSummary] = useState({ members: 0, news: 0, events: 0, photos: 0 });
  const [relations, setRelations] = useState({ father: null, mother: null, spouse: null, sons: [], daughters: [] });
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingRelations, setLoadingRelations] = useState(true);

  useEffect(() => {
    function getStoredSerNo() {
      try {
        const raw = localStorage.getItem('currentUser');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.serNo ?? null;
      } catch (_) {
        return null;
      }
    }

    async function fetchUser() {
      const token = localStorage.getItem('authToken');
      const storedSerNo = getStoredSerNo();
      if (!token || token === 'undefined' || token === 'null') {
        if (storedSerNo) {
          try {
            const memberRes = await fetch(`/api/family/members/by-serno/${storedSerNo}`);
            if (memberRes.ok) {
              const payload = await memberRes.json();
              const member = payload?.member;
              if (member) {
                const fullName = `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.replace(/\s+/g, ' ').trim();
                setUser({
                  serNo: member.serNo ?? storedSerNo,
                  fullName,
                  firstName: member.firstName || fullName || 'Guest'
                });
                return;
              }
            }
          } catch (_) {
          }
        }
        setUser({ firstName: 'Guest' });
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const serNo = data.serNo ?? storedSerNo;
          if (serNo) {
            try {
              const memberRes = await fetch(`/api/family/members/by-serno/${serNo}`);
              if (memberRes.ok) {
                const payload = await memberRes.json();
                const member = payload?.member;
                if (member) {
                  const fullName = `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.replace(/\s+/g, ' ').trim();
                  setUser({
                    serNo,
                    fullName,
                    firstName: member.firstName || fullName || 'Guest'
                  });
                  return;
                }
              }
            } catch (_) {
            }
          }
          const basicName = data.name || data.username || data.firstName || 'Guest';
          setUser({
            serNo,
            fullName: basicName,
            firstName: basicName
          });
        } else {
          setUser({ firstName: 'Guest' });
        }
      } catch (e) {
        setUser({ firstName: 'Guest' });
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadSummary() {
      setLoadingSummary(true);
      try {
        const response = await fetch('/api/dashboard/summary', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to load summary');
        }
        const data = await response.json();
        if (isMounted) {
          setSummary({
            members: data.members ?? 0,
            news: data.news ?? 0,
            events: data.events ?? 0,
            photos: data.photos ?? 0
          });
        }
      } catch (_) {
        if (isMounted) {
          setSummary({ members: 0, news: 0, events: 0, photos: 0 });
        }
      } finally {
        if (isMounted) {
          setLoadingSummary(false);
        }
      }
    }
    async function loadRelations() {
      setLoadingRelations(true);
      try {
        const response = await fetch('/api/dashboard/relations', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to load relations');
        }
        const data = await response.json();
        if (isMounted) {
          const payload = data?.relations || {};
          setRelations({
            father: payload.father || null,
            mother: payload.mother || null,
            spouse: payload.spouse || null,
            sons: Array.isArray(payload.sons) ? payload.sons : [],
            daughters: Array.isArray(payload.daughters) ? payload.daughters : []
          });
        }
      } catch (_) {
        if (isMounted) {
          setRelations({ father: null, mother: null, spouse: null, sons: [], daughters: [] });
        }
      } finally {
        if (isMounted) {
          setLoadingRelations(false);
        }
      }
    }
    loadSummary();
    loadRelations();
    return () => {
      isMounted = false;
    };
  }, []);

  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const rawFullName = typeof user?.fullName === 'string' ? user.fullName.trim() : '';
  const greetingText = rawFullName ? `Hi, ${rawFullName}!` : 'Hi!';

  const quickStats = [
    { title: 'Family Members', value: loadingSummary ? '—' : summary.members, icon: Users, tint: 'bg-orange-100 text-orange-600', chip: loadingSummary ? 'Loading...' : `${summary.members} total` },
    { title: 'Recent News', value: loadingSummary ? '—' : summary.news, icon: Newspaper, tint: 'bg-emerald-100 text-emerald-600', chip: loadingSummary ? 'Loading...' : `${summary.news} entries` },
    { title: 'Upcoming Events', value: loadingSummary ? '—' : summary.events, icon: Calendar, tint: 'bg-violet-100 text-violet-600', chip: loadingSummary ? 'Loading...' : `${summary.events} scheduled` },
    { title: 'New Photos/albums', value: loadingSummary ? '—' : summary.photos, icon: TrendingUp, tint: 'bg-amber-100 text-amber-700', chip: loadingSummary ? 'Loading...' : `${summary.photos} items` },
  ];

  const [recentNews, setRecentNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [newsError, setNewsError] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardNews = async () => {
      setLoadingNews(true);
      try {
        setNewsError(false);
        const response = await fetch('/api/dashboard/news?limit=3', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard news');
        }
        const data = await response.json();
        if (isMounted) {
          const list = Array.isArray(data?.news) ? data.news : [];
          setRecentNews(list.slice(0, 3));
          setNewsError(list.length === 0);
        }
      } catch (_) {
        if (isMounted) {
          setRecentNews([]);
          setNewsError(true);
        }
      } finally {
        if (isMounted) {
          setLoadingNews(false);
        }
      }
    };
    const fetchDashboardEvents = async () => {
      setLoadingEvents(true);
      try {
        setEventsError(false);
        const response = await fetch('/api/dashboard/events?limit=3', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard events');
        }
        const data = await response.json();
        if (isMounted) {
          const list = Array.isArray(data?.events) ? data.events : [];
          setUpcomingEvents(list.slice(0, 3));
          setEventsError(list.length === 0);
        }
      } catch (_) {
        if (isMounted) {
          setUpcomingEvents([]);
          setEventsError(true);
        }
      } finally {
        if (isMounted) {
          setLoadingEvents(false);
        }
      }
    };

    fetchDashboardNews();
    fetchDashboardEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
  <div className="space-y-8 xs:space-y-12" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="relative overflow-hidden rounded-3xl shadow-[0_20px_45px_rgba(249,115,22,0.25)] transition-all duration-500">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(140deg, rgba(253,186,116,0.45), rgba(249,115,22,0.3))' }} />
        <div className="absolute inset-y-0 -left-20 w-56 sm:w-72 opacity-50 blur-3xl" style={{ background: 'radial-gradient(circle at center, rgba(255,255,255,0.55), rgba(253,186,116,0))' }} />
        <div className="absolute inset-y-0 -right-24 w-64 sm:w-80 opacity-40 blur-[90px]" style={{ background: 'radial-gradient(circle at center, rgba(249,115,22,0.5), rgba(249,115,22,0))' }} />
        <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-3xl px-6 py-8 sm:px-9 sm:py-10 lg:px-12 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-10 ring-1 ring-white/10">
          <div className="space-y-5 max-w-3xl">
            <div className="space-y-3">
              <h1 className="text-3xl xs:text-4xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight drop-shadow-lg">
                {greetingText}
              </h1>
            </div>
            <p className="text-amber-50/90 text-base sm:text-lg leading-relaxed max-w-2xl">
              This is your personalized family dashboard. Explore news, events, and more tailored for you.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex items-center text-sm px-3 py-1.5 rounded-full bg-white/15 font-semibold backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5 hover:bg-white/20">
                <Shield size={16} className="mr-2" /> Secure Space
              </div>
              <div className="inline-flex items-center text-sm px-3 py-1.5 rounded-full bg-white/15 font-semibold backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5 hover:bg-white/20">
                <Star size={16} className="mr-2" /> Family First
              </div>
            </div>
          </div>
          <div className="flex w-full md:w-auto justify-end">
            <button
              className="group bg-white/15 rounded-2xl p-3 sm:p-4 border border-white/30 hover:bg-white/25 hover:shadow-xl transition-all duration-300 backdrop-blur"
              onClick={() => setShowProfile(true)}
              aria-label="View Profile"
            >
              <User size={36} className="text-white group-hover:scale-105 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat) => (
          <Card key={stat.title} className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 border-amber-200 shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl">
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-700 mb-1 uppercase tracking-wide">{stat.title}</p>
                <p className="text-3xl font-black text-amber-900 tracking-tight flex items-baseline gap-2">
                  <span>{stat.value}</span>
                  {!loadingSummary && <span className="text-xs font-semibold text-amber-600 uppercase">Live</span>}
                </p>
                <span className="inline-flex mt-2 text-xs px-2.5 py-1.5 rounded-full bg-white/70 text-amber-700 border border-amber-200 font-medium shadow-sm">
                  {stat.chip}
                </span>
              </div>
              <div className="bg-white/70 text-amber-600 rounded-xl p-3 shadow-inner">
                <stat.icon size={28} className="w-7 h-7" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Family Tree Section (enlarged, no tree, info + button, vertical list) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xs:gap-8">
        {/* Family Tree Info Card */}
        <Card className="md:col-span-2 flex flex-col justify-between min-h-[300px]">
          <div className="p-6 flex flex-col h-full justify-center">
            <div className="flex items-center mb-4">
              <GitBranch className="mr-2 text-orange-600" size={28} />
              <h2 className="text-2xl font-bold text-gray-900">Family Tree</h2>
            </div>
            <p className="text-gray-700 text-lg mb-6">Explore your family lineage, relationships, and history. View the full Kulavruksh for a detailed tree and connections.</p>
            <button
              className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-3 rounded-lg text-lg shadow transition"
              onClick={() => navigate('/kulavruksh')}
            >
              View Family Tree
            </button>
          </div>
        </Card>
        {/* Vertical Family Members List */}
        <Card className="flex flex-col min-h-[300px] p-0">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="mr-2 text-orange-600" size={20} /> Family Members
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {loadingRelations ? (
              <div className="text-center text-amber-600 text-sm">Loading relationships...</div>
            ) : (
              <ul className="space-y-3">
                {relations.father && (
                  <li className="flex items-center gap-3 text-gray-800">
                    <User className="text-orange-500" size={20} /> {relations.father.name} (Father)
                  </li>
                )}
                {relations.mother && (
                  <li className="flex items-center gap-3 text-gray-800">
                    <User className="text-orange-500" size={20} /> {relations.mother.name} (Mother)
                  </li>
                )}
                {relations.spouse && (
                  <li className="flex items-center gap-3 text-gray-800">
                    <User className="text-orange-500" size={20} /> {relations.spouse.name} (Spouse)
                  </li>
                )}
                {relations.sons.map((entry) => (
                  <li key={`son-${entry.serNo || entry.name}`} className="flex items-center gap-3 text-gray-800">
                    <User className="text-orange-500" size={20} /> {entry.name} (Son)
                  </li>
                ))}
                {relations.daughters.map((entry) => (
                  <li key={`daughter-${entry.serNo || entry.name}`} className="flex items-center gap-3 text-gray-800">
                    <User className="text-orange-500" size={20} /> {entry.name} (Daughter)
                  </li>
                ))}
                {!relations.father && !relations.mother && !relations.spouse && relations.sons.length === 0 && relations.daughters.length === 0 && (
                  <li className="text-center text-gray-500 text-sm">No relationships found.</li>
                )}
              </ul>
            )}
          </div>
        </Card>
      </div>

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Announcements & Updates */}
        <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 border-amber-200 shadow-lg">
          <div className="p-6 border-b border-amber-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-amber-900 flex items-center">
                <Newspaper className="mr-2 text-amber-600" size={24} />
                <span>Announcements & Updates</span>
              </h2>
              <Link to="/gogte-news" className="text-amber-600 hover:text-amber-800 text-sm font-semibold">View All</Link>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-5">
              {loadingNews && recentNews.length === 0 && (
                <div className="border border-dashed border-amber-300 rounded-xl p-5 bg-white text-center text-amber-600 text-base">
                  Loading latest announcements...
                </div>
              )}
              {!loadingNews && newsError && (
                <div className="border border-dashed border-amber-300 rounded-xl p-5 bg-white text-center text-amber-600 text-base">
                  No announcements available right now.
                </div>
              )}
              {recentNews.map((news) => (
                <div key={news.id || news._id} className="border border-amber-200 rounded-xl p-5 bg-white/90 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-amber-900 mb-1 hover:text-amber-600 cursor-pointer text-lg">{news.title}</h3>
                      {news.summary && <p className="text-amber-800 text-sm sm:text-base mb-3 leading-relaxed">{news.summary}</p>}
                    </div>
                    {typeof news.likes === 'number' && (
                      <div className="flex items-center text-amber-600 text-xs font-semibold bg-amber-50 border border-amber-200 rounded-full px-3 py-1 shrink-0">
                        <Heart size={14} className="mr-1" />{news.likes}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-xs text-amber-700 gap-3">
                    <div className="flex items-center space-x-4">
                      <span>By {toText(news.authorName) || toText(news.author) || 'Admin'}</span>
                      <span className="flex items-center"><Clock size={14} className="mr-1" />{formatRelativeDate(news.createdAt || news.publishDate)}</span>
                    </div>
                    <button
                      className="text-amber-600 hover:text-amber-800 font-semibold"
                      onClick={() => navigate('/gogte-news')}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Upcoming Events (moved next to Announcements & Updates) */}
        <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 border-amber-200 shadow-lg">
          <div className="p-6 border-b border-amber-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-amber-900 flex items-center">
                <Calendar className="mr-2 text-amber-600" size={24} /> Upcoming Events
              </h2>
              <Link to="/gogte-events" className="text-amber-600 hover:text-amber-800 text-sm font-semibold">View All</Link>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-5">
              {loadingEvents && upcomingEvents.length === 0 && (
                <div className="border border-dashed border-amber-300 rounded-xl p-5 bg-white text-center text-amber-600 text-base">
                  Loading upcoming events...
                </div>
              )}
              {!loadingEvents && eventsError && (
                <div className="border border-dashed border-amber-300 rounded-xl p-5 bg-white text-center text-amber-600 text-base">
                  Unable to load events.
                </div>
              )}
              {!loadingEvents && !eventsError && upcomingEvents.length === 0 && (
                <div className="border border-dashed border-amber-300 rounded-xl p-5 bg-white text-center text-amber-600 text-base">
                  No upcoming events at the moment.
                </div>
              )}
              {upcomingEvents.map((event) => (
                <div key={event.id || event._id} className="border border-amber-200 rounded-xl p-5 bg-white/90 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-amber-900 mb-1 text-lg">
                        {event.eventName || event.title}
                      </h3>
                      {event.description && (
                        <p className="text-amber-800 text-sm sm:text-base leading-relaxed">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end text-right text-xs text-amber-600">
                      <span className="font-semibold bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                        {formatEventDate(event.fromDate || event.date)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-amber-700 gap-3">
                    {event.venue && (
                      <span className="flex items-center gap-2">
                        <Users size={14} />
                        {event.venue}
                      </span>
                    )}
                    <button
                      className="text-amber-600 hover:text-amber-800 font-semibold"
                      onClick={() => navigate('/gogte-events')}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>


      <Footer />

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-lg max-w-3xl w-full p-6 relative overflow-y-auto max-h-[90vh]">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-orange-600 text-2xl font-bold"
              onClick={() => setShowProfile(false)}
              aria-label="Close Profile"
            >
              ×
            </button>
            <Profile />
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6 relative">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Confirm Logout</h2>
            <p className="text-gray-700 mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
                onClick={() => {
                  setShowLogoutModal(false);
                  try {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('currentUser');
                  } catch (_) {}
                  navigate('/login', { replace: true });
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
  </div>
  );
};

export default Dashboard;