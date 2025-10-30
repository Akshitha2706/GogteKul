import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Search, Star, User, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AddNewsModal } from './AddNewsModal';
import Footer from '../components/Footer';
import api, { apiFetchNews, apiCreateNews } from '../utils/api';

export default function GogteNewsPage() {
  const { t } = useTranslation();
  const [news, setNews] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNews, setSelectedNews] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const scrollerRef = useRef(null);

  const loadNews = async () => {
    try {
      const data = await apiFetchNews();
      setNews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load news', error);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const getNewsId = (item) => item?._id || item?.id;

  const getAuthorName = (item) => {
    if (!item) return t('common.anonymous');
    if (item.authorName) return item.authorName;
    if (typeof item.author === 'string') return item.author;
    if (item.author?.fullName) return item.author.fullName;
    if (item.author?.name) return item.author.name;
    return t('common.anonymous');
  };

  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesPriority = selectedPriority === 'all' || item.priority === selectedPriority;
      const matchesSearch = [
        item.title,
        item.summary,
        item.content,
        Array.isArray(item.tags) ? item.tags.join(' ') : '',
        getAuthorName(item),
      ].some((value) => String(value || '').toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesPriority && matchesSearch;
    });
  }, [news, selectedCategory, selectedPriority, searchTerm, t]);

  const handleAddNews = async (newNews) => {
    try {
      const created = await apiCreateNews(newNews);
      setNews((prev) => [created, ...prev]);
    } catch (error) {
      console.error('Failed to create news', error);
    }
  };

  const categories = [
    { value: 'all', label: t('newsPage.allCategories') },
    { value: 'announcement', label: t('newsPage.categories.announcement') },
    { value: 'achievement', label: t('newsPage.categories.achievement') },
    { value: 'celebration', label: t('newsPage.categories.celebration') },
    { value: 'tradition', label: t('newsPage.categories.tradition') },
    { value: 'milestone', label: t('newsPage.categories.milestone') },
    { value: 'reunion', label: t('newsPage.categories.reunion') },
    { value: 'memory', label: t('newsPage.categories.memory') },
    { value: 'general', label: t('newsPage.categories.general') }
  ];

  const priorities = [
    { value: 'all', label: t('newsPage.allCategories') },
    { value: 'high', label: t('newsPage.priorityOptions.high') },
    { value: 'medium', label: t('newsPage.priorityOptions.medium') },
    { value: 'low', label: t('newsPage.priorityOptions.low') }
  ];

  const getCategoryLabel = (value) => {
    const entry = categories.find((item) => item.value === value);
    return entry ? entry.label : value || t('newsPage.categories.general');
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



  const handleNewsClick = (newsItem) => {
    const targetId = getNewsId(newsItem);
    const latestNewsItem = news.find((item) => getNewsId(item) === targetId) || newsItem;
    setSelectedNews(latestNewsItem);
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

  const featuredNews = useMemo(() => {
    // Get current date and calculate start of current week (Monday)
    const today = new Date();
    const currentDay = today.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // Filter news from current week only
    const thisWeekNews = news.filter((item) => {
      const itemDate = new Date(item.publishDate || item.createdAt);
      return itemDate >= weekStart;
    });

    // Sort by priority and date
    const combined = [...thisWeekNews].sort((a, b) => {
      const priorityOrder = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
      const aPriority = priorityOrder[a.priority] ?? 999;
      const bPriority = priorityOrder[b.priority] ?? 999;
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      const aDate = new Date(a.publishDate || a.createdAt).getTime();
      const bDate = new Date(b.publishDate || b.createdAt).getTime();
      return bDate - aDate;
    });
    return combined.slice(0, 8);
  }, [news]);

  const selectedDetails = useMemo(() => {
    if (!selectedNews) {
      return {
        id: null,
        imageUrl: '',
        imageCaption: '',
        publishDate: '',
        createdAt: '',
        updatedAt: '',
        tags: [],
        likes: 0,
        comments: 0,
      };
    }
    const imageUrl = selectedNews?.images?.url || selectedNews?.images?.thumbnail || '';
    return {
      id: getNewsId(selectedNews),
      imageUrl,
      imageCaption: selectedNews?.images?.caption || '',
      publishDate: selectedNews?.publishDate || selectedNews?.createdAt || '',
      createdAt: selectedNews?.createdAt || '',
      updatedAt: selectedNews?.updatedAt || '',
      tags: Array.isArray(selectedNews?.tags) ? selectedNews.tags : [],
      visibleVanshNumbers: Array.isArray(selectedNews?.visibleVanshNumbers)
        ? selectedNews.visibleVanshNumbers
        : Array.isArray(selectedNews?.visibleVansh) ? selectedNews.visibleVansh : [],
      visibleToAllVansh: Boolean(selectedNews?.visibleToAllVansh),
    };
  }, [selectedNews]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-orange-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-amber-800 mb-2">{t('newsPage.title')}</h1>
              <p className="text-amber-700">{t('newsPage.subtitle')}</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                {t('newsPage.backToDashboard')}
              </Link>
              <AddNewsModal onAddNews={handleAddNews} />
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
                placeholder={t('newsPage.filters.searchPlaceholder')}
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

        {/* Featured News Scroller */}
        {featuredNews.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-amber-800">Trending & High Priority</h2>
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
              {featuredNews.map((newsItem, index) => {
                const newsId = getNewsId(newsItem);
                const imageUrl = newsItem?.images?.thumbnail || newsItem?.images?.url;
                const publishDate = newsItem?.publishDate || newsItem?.createdAt || newsItem?.updatedAt;
                return (
                  <div
                    key={newsId || `featured-${index}`}
                    onClick={() => handleNewsClick(newsItem)}
                    className="flex-shrink-0 w-80 bg-white rounded-xl shadow-md border border-orange-200 overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300"
                  >
                    <div className="aspect-video bg-gradient-to-br from-amber-100 to-orange-200 relative overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={newsItem?.title || 'News image'}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-4xl">📰</span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                          {getCategoryLabel(newsItem?.category)}
                        </span>
                      </div>
                      {(newsItem?.priority === 'High' || newsItem?.priority === 'Urgent') && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          {newsItem.priority === 'Urgent' ? '🔴 URGENT' : '⚠️ HIGH'}
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="text-lg font-bold text-amber-800 mb-2 line-clamp-2">
                        {newsItem?.title}
                      </h3>
                      {newsItem?.summary && (
                        <p className="text-amber-700 mb-3 line-clamp-2 text-sm">
                          {newsItem.summary}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-amber-600">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {getAuthorName(newsItem)}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(publishDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNews.length > 0 ? (
            filteredNews.map((newsItem, index) => {
              const newsId = getNewsId(newsItem);
              const imageUrl = newsItem?.images?.thumbnail || newsItem?.images?.url;
              const publishDate = newsItem?.publishDate || newsItem?.createdAt || newsItem?.updatedAt;
              return (
                <div
                  key={newsId || `news-${index}`}
                  onClick={() => handleNewsClick(newsItem)}
                  className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="aspect-video bg-gradient-to-br from-amber-100 to-orange-200 relative">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={newsItem?.title || 'News image'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-amber-200 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-2xl">📰</span>
                          </div>
                          <p className="text-amber-600 font-medium">No Image</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {getCategoryLabel(newsItem?.category)}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-amber-800 mb-2 line-clamp-2">
                      {newsItem?.title}
                    </h3>
                    {newsItem?.summary && (
                      <p className="text-amber-700 mb-2 line-clamp-2">
                        {newsItem.summary}
                      </p>
                    )}
                    {newsItem?.content && (
                      <p className="text-amber-600 mb-4 line-clamp-3 text-sm">
                        {newsItem.content}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-amber-600">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {getAuthorName(newsItem)}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDate(publishDate)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                          <Star className="w-4 h-4 mr-1" />
                          {getPriorityLabel(newsItem?.priority)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 bg-white rounded-xl shadow-sm border border-orange-200 p-12 text-center">
              <div className="text-amber-500 mb-4">
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-amber-800 mb-2">कोणतीही बातम्या सापडल्या नाहीत</h3>
              <p className="text-amber-700">आपल्या शोध निकषांनुसार कोणतीही बातम्या उपलब्ध नाहीत.</p>
            </div>
          )}
        </div>
      </div>

      {/* News Detail Modal */}
      {showDetailModal && selectedNews && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-orange-200">
              <h2 className="text-2xl font-bold text-amber-800">News Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-amber-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-amber-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Image */}
              <div className="aspect-video bg-gradient-to-br from-amber-100 to-orange-200 rounded-lg mb-6 relative overflow-hidden">
                {selectedDetails.imageUrl ? (
                  <img
                    src={selectedDetails.imageUrl}
                    alt={selectedNews?.title || 'News image'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-amber-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">📰</span>
                      </div>
                      <p className="text-amber-600 font-medium text-lg">No Image Available</p>
                    </div>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className="bg-amber-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    {getCategoryLabel(selectedNews?.category)}
                  </span>
                </div>
                {selectedDetails.imageCaption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-sm px-4 py-2">
                    {selectedDetails.imageCaption}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h1 className="text-3xl font-bold text-amber-800 mb-4">{selectedNews?.title}</h1>

                <div className="flex flex-wrap items-center gap-4 text-amber-600 mb-4">
                  <span className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    <strong>Author:</strong> {getAuthorName(selectedNews)}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    <strong>Published:</strong> {formatDateTime(selectedDetails.publishDate)}
                  </span>
                  {selectedDetails.updatedAt && (
                    <span className="flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      <strong>Updated:</strong> {formatDateTime(selectedDetails.updatedAt)}
                    </span>
                  )}
                  {selectedNews?.priority && (
                    <span className="flex items-center">
                      <Star className="w-5 h-5 mr-2" />
                      <strong>Priority:</strong> {getPriorityLabel(selectedNews.priority)}
                    </span>
                  )}
                  {selectedNews?.location && (
                    <span className="flex items-center">
                      <span className="w-5 h-5 mr-2">📍</span>
                      <strong>Location:</strong> {selectedNews.location}
                    </span>
                  )}
                  {selectedNews?.eventDate && (
                    <span className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      <strong>Event Date:</strong> {formatDate(selectedNews.eventDate)}
                    </span>
                  )}
                </div>

                {selectedDetails.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedDetails.tags.map((tag, index) => (
                      <span key={index} className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {selectedDetails.visibleToAllVansh ? (
                  <div className="bg-amber-200 text-amber-800 px-3 py-2 rounded-full text-sm font-semibold inline-flex items-center mb-4">
                    Visible to all vansh
                  </div>
                ) : (
                  selectedDetails.visibleVanshNumbers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedDetails.visibleVanshNumbers.map((number) => (
                        <span key={number} className="bg-amber-200 text-amber-800 px-3 py-1 rounded-full text-sm">
                          Vansh #{number}
                        </span>
                      ))}
                    </div>
                  )
                )}

                {selectedNews?.summary && (
                  <p className="text-amber-700 mb-4 text-lg">{selectedNews.summary}</p>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-amber-800 mb-3">Story</h3>
                <p className="text-amber-700 leading-relaxed text-lg">{selectedNews?.content}</p>
              </div>


            </div>
      </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
