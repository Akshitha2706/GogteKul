import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Search, Calendar, Users, Star, RefreshCw, User, Clock, Heart, MessageCircle, X, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AddNewsModal } from './AddNewsModal';
import { NewsCard } from './NewsCard';
import Footer from '../components/Footer';
import api, { apiFetchNews, apiCreateNews } from '../utils/api';

export default function GogteNewsPage() {
  const { t } = useTranslation();
  const [news, setNews] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNews, setSelectedNews] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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

  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = [item.title, item.content].some((value) =>
        String(value || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      return matchesCategory && matchesSearch;
    });
  }, [news, selectedCategory, searchTerm]);

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



  const handleNewsClick = (newsItem) => {
    const latestNewsItem = news.find((item) => item.id === newsItem.id) || newsItem;
    setSelectedNews(latestNewsItem);
    setShowDetailModal(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadNews();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLike = (newsId) => {
    let updatedItem = null;
    setNews((prev) =>
      prev.map((item) => {
        if (item.id !== newsId) {
          return item;
        }
        const likedBy = Array.isArray(item.likedBy) ? item.likedBy : [];
        const hasLiked = likedBy.includes('currentUser');
        const updatedLikedBy = hasLiked ? likedBy.filter((id) => id !== 'currentUser') : likedBy.concat('currentUser');
        const likes = Number(item.likes) || 0;
        const nextLikes = hasLiked ? Math.max(0, likes - 1) : likes + 1;
        const updated = { ...item, likedBy: updatedLikedBy, likes: nextLikes };
        updatedItem = updated;
        return updated;
      })
    );
    if (updatedItem && selectedNews?.id === newsId) {
      setSelectedNews(updatedItem);
    }
  };

  const handleAddComment = (newsId, text) => {
    const newComment = {
      id: String(Date.now()),
      author: 'You',
      text,
      timestamp: new Date().toLocaleString(),
    };
    let updatedItem = null;
    setNews((prev) =>
      prev.map((item) => {
        if (item.id !== newsId) {
          return item;
        }
        const commentsList = Array.isArray(item.commentsList) ? item.commentsList : [];
        const commentsCount = Number(item.comments) || commentsList.length;
        const updatedCommentsList = commentsList.concat(newComment);
        const updated = {
          ...item,
          commentsList: updatedCommentsList,
          comments: commentsCount + 1,
        };
        updatedItem = updated;
        return updated;
      })
    );
    if (updatedItem && selectedNews?.id === newsId) {
      setSelectedNews(updatedItem);
    }
  };

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
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <AddNewsModal onAddNews={handleAddNews} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder={t('newsPage.searchNews')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="lg:w-64">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-5 h-5" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none bg-white"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-200">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-amber-500 mr-3" />
              <div>
                <p className="text-sm text-amber-700">एकूण बातम्या</p>
                <p className="text-2xl font-bold text-amber-800">{news.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-200">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-amber-500 mr-3" />
              <div>
                <p className="text-sm text-amber-700">सक्रिय लेखक</p>
                <p className="text-2xl font-bold text-amber-800">{new Set(news.map(n => n.author)).size}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-200">
            <div className="flex items-center">
              <Star className="w-8 h-8 text-amber-500 mr-3" />
              <div>
                <p className="text-sm text-amber-700">एकूण लाइक्स</p>
                <p className="text-2xl font-bold text-amber-800">{news.reduce((sum, n) => sum + n.likes, 0)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-200">
            <div className="flex items-center">
              <Filter className="w-8 h-8 text-amber-500 mr-3" />
              <div>
                <p className="text-sm text-amber-700">श्रेण्या</p>
                <p className="text-2xl font-bold text-amber-800">{categories.length - 1}</p>
              </div>
            </div>
          </div>
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNews.length > 0 ? (
            filteredNews.map(newsItem => (
              <div 
                key={newsItem.id} 
                onClick={() => handleNewsClick(newsItem)}
                className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300"
              >
                {/* Image */}
                <div className="aspect-video bg-gradient-to-br from-amber-100 to-orange-200 relative">
                  {newsItem.imageUrl ? (
                    <img 
                      src={newsItem.imageUrl} 
                      alt={newsItem.title}
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
                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {categories.find(cat => cat.value === newsItem.category)?.label || newsItem.category}
                    </span>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-amber-800 mb-2 line-clamp-2">
                    {newsItem.title}
                  </h3>
                  <p className="text-amber-700 mb-4 line-clamp-3">
                    {newsItem.content}
                  </p>
                  
                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-sm text-amber-600">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {newsItem.author}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {newsItem.timestamp}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center">
                        <Heart className="w-4 h-4 mr-1" />
                        {newsItem.likes}
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {newsItem.comments}
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
                {selectedNews.imageUrl ? (
                  <img 
                    src={selectedNews.imageUrl} 
                    alt={selectedNews.title}
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
                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                  <span className="bg-amber-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    {categories.find(cat => cat.value === selectedNews.category)?.label || selectedNews.category}
                  </span>
                </div>
              </div>

              {/* Title and Meta */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-amber-800 mb-4">{selectedNews.title}</h1>
                
                <div className="flex flex-wrap items-center gap-4 text-amber-600 mb-4">
                  <span className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    <strong>Author:</strong> {selectedNews.author}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    <strong>Posted:</strong> {selectedNews.timestamp}
                  </span>
                  {selectedNews.location && (
                    <span className="flex items-center">
                      <span className="w-5 h-5 mr-2">📍</span>
                      <strong>Location:</strong> {selectedNews.location}
                    </span>
                  )}
                  {selectedNews.eventDate && (
                    <span className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      <strong>Event Date:</strong> {new Date(selectedNews.eventDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {selectedNews.tags && selectedNews.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedNews.tags.map((tag, index) => (
                      <span key={index} className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-amber-800 mb-3">Story</h3>
                <p className="text-amber-700 leading-relaxed text-lg">{selectedNews.content}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-orange-200 pt-6">
                <div className="flex items-center space-x-6">
                  <button
                    onClick={() => handleLike(selectedNews.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      selectedNews.likedBy && selectedNews.likedBy.includes('currentUser')
                        ? 'bg-red-100 hover:bg-red-200 text-red-700'
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${selectedNews.likedBy && selectedNews.likedBy.includes('currentUser') ? 'fill-current' : ''}`} />
                    <span>{selectedNews.likes} Likes</span>
                  </button>
                  <span className="flex items-center space-x-2 text-amber-600">
                    <MessageCircle className="w-5 h-5" />
                    <span>{selectedNews.comments} Comments</span>
                  </span>
                </div>
                
                <button className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors">
                  <span>Share</span>
                </button>
              </div>

              {/* Comments Section */}
              <div className="mt-6 border-t border-orange-200 pt-6">
                <h3 className="text-xl font-semibold text-amber-800 mb-4">Comments</h3>
                
                {/* Add Comment */}
                <div className="mb-6">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      className="flex-1 px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          handleAddComment(selectedNews.id, e.target.value.trim());
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.target.previousElementSibling;
                        if (input.value.trim()) {
                          handleAddComment(selectedNews.id, input.value.trim());
                          input.value = '';
                        }
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {selectedNews.commentsList && selectedNews.commentsList.length > 0 ? (
                    selectedNews.commentsList.map((comment) => (
                      <div key={comment.id} className="bg-amber-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-amber-800">{comment.author}</span>
                          <span className="text-sm text-amber-600">{comment.timestamp}</span>
                        </div>
                        <p className="text-amber-700">{comment.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-amber-600">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No comments yet. Be the first to comment!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
      </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
