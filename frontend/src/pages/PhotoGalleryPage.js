import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Search, Calendar, Users, Star, RefreshCw, User, Clock, Heart, MessageCircle, X, Send, Camera, MapPin, Tag, Plus, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AddPhotoModal } from './AddPhotoModal';
import { PhotoCard } from './PhotoCard';
import Footer from '../components/Footer';

export default function PhotoGalleryPage() {
  const { t } = useTranslation();
  
  const [photos, setPhotos] = useState([
    {
      id: 1,
      title: "Gogte Family's Ancestral Home",
      description: "This is our family's ancestral home where our forefathers lived. The house holds many precious memories and stories from generations past.",
      photographer: "Raju Gogte",
      category: "heritage",
      location: "Gogave, Satara",
      eventDate: "1950-01-01",
      tags: ["family", "history", "home", "heritage"],
      timestamp: "2 days ago",
      likes: 24,
      comments: 8,
      imageUrl: "https://images.unsplash.com/photo-1685702232056-657ddb88676a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFkaXRpb25hbCUyMGluZGlhbiUyMGZhbWlseSUyMHBob3RvcyUyMHZpbnRhZ2UlMjBzZXBpYXxlbnwxfHx8fDE3NTcyNjc2MDh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      generation: "1950s",
      occasion: "House Photo"
    },
    {
      id: 2,
      title: "Grandparents' Wedding",
      description: "This is a precious photo of our grandparents' wedding ceremony. The traditional attire and decorations reflect the cultural heritage of our family.",
      photographer: "Sunita Gogte",
      category: "celebration",
      location: "Pune, Maharashtra",
      eventDate: "1960-05-15",
      tags: ["wedding", "traditional", "grandparents", "celebration"],
      timestamp: "1 week ago",
      likes: 45,
      comments: 15,
      imageUrl: "https://images.unsplash.com/photo-1719468452346-20bbb785de2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjB3ZWRkaW5nJTIwY2VsZWJyYXRpb24lMjB0cmFkaXRpb25hbHxlbnwxfHx8fDE3NTcyNjc2MTJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      generation: "1960s",
      occasion: "Wedding"
    },
    {
      id: 3,
      title: "Ganesh Festival Celebration",
      description: "Our complete family photo from this year's Ganesh festival celebration. Everyone came together to celebrate this auspicious occasion with great joy and devotion.",
      photographer: "Anil Gogte",
      category: "celebration",
      location: "Mumbai, Maharashtra",
      eventDate: "2024-09-15",
      tags: ["ganeshfestival", "festival", "family", "celebration"],
      timestamp: "2 weeks ago",
      likes: 38,
      comments: 12,
      imageUrl: "https://images.unsplash.com/photo-1720238280932-80c60018e055?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW1pbHklMjBjZWxlYnJhdGlvbiUyMGZlc3RpdmFsJTIwdHJhZGl0aW9uYWx8ZW58MXx8fHwxNzU3MjY3NjE2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      generation: "2020s",
      occasion: "Ganesh Festival"
    }
  ]);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isGalleryMode, setIsGalleryMode] = useState(false);
  const [currentGalleryPhotos, setCurrentGalleryPhotos] = useState([]);
  const [storageError, setStorageError] = useState(false);

  // Load photos from localStorage on component mount
  useEffect(() => {
    try {
      const savedPhotos = localStorage.getItem('gogtePhotos');
      if (savedPhotos) {
        setPhotos(JSON.parse(savedPhotos));
      }
    } catch (error) {
      console.error('Error loading photos from localStorage:', error);
      // Keep default photos if localStorage fails
    }
  }, []);

  // Save photos to localStorage whenever photos state changes
  useEffect(() => {
    try {
      // Only save if photos have changed from initial state
      if (photos.length > 0) {
        localStorage.setItem('gogtePhotos', JSON.stringify(photos));
      }
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded. Photos will not be persisted.');
        setStorageError(true);
      } else {
        console.error('Error saving photos to localStorage:', error);
      }
    }
  }, [photos]);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'heritage', label: 'Heritage' },
    { value: 'celebration', label: 'Celebration' },
    { value: 'wedding', label: 'Wedding' },
    { value: 'festival', label: 'Festival' },
    { value: 'family', label: 'Family Gathering' },
    { value: 'achievement', label: 'Achievement' },
    { value: 'memory', label: 'Memory' },
    { value: 'general', label: 'General' }
  ];

  const filteredPhotos = photos.filter(photo => {
    const matchesCategory = selectedCategory === 'all' || photo.category === selectedCategory;
    const matchesSearch = photo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.photographer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Keyboard navigation for gallery
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showDetailModal && isGalleryMode) {
        if (e.key === 'ArrowRight') {
          handleNextPhoto();
        } else if (e.key === 'ArrowLeft') {
          handlePrevPhoto();
        } else if (e.key === 'Escape') {
          handleCloseModal();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDetailModal, isGalleryMode, currentPhotoIndex, filteredPhotos]);

  const handleAddPhoto = (newPhoto) => {
    // If this is a multiple photo upload (has multiple imageUrls)
    if (newPhoto.imageUrls && newPhoto.imageUrls.length > 1) {
      // Create a photo collection
      const photoCollection = {
        id: Date.now(),
        title: newPhoto.title,
        description: newPhoto.description,
        category: newPhoto.category,
        imageUrl: newPhoto.imageUrls[0], // Use first image as main image
        imageUrls: newPhoto.imageUrls, // Store all images
        photographer: newPhoto.photographer || "Family Member",
        location: newPhoto.location,
        eventDate: newPhoto.eventDate,
        tags: newPhoto.tags || [],
        timestamp: "Just now",
        likes: 0,
        comments: 0,
        generation: newPhoto.generation || '2020s',
        occasion: newPhoto.occasion || 'General',
        isCollection: true,
        photoCount: newPhoto.imageUrls.length
      };
      setPhotos([photoCollection, ...photos]);
    } else {
      // Single photo upload
      const photoItem = {
        id: Date.now(),
        title: newPhoto.title,
        description: newPhoto.description,
        category: newPhoto.category,
        imageUrl: newPhoto.imageUrl,
        photographer: newPhoto.photographer || "Family Member",
        location: newPhoto.location,
        eventDate: newPhoto.eventDate,
        tags: newPhoto.tags || [],
        timestamp: "Just now",
        likes: 0,
        comments: 0,
        generation: newPhoto.generation || '2020s',
        occasion: newPhoto.occasion || 'General',
        isCollection: false,
        photoCount: 1
      };
      setPhotos([photoItem, ...photos]);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false);
      // In a real app, you would fetch fresh data from the server here
    }, 1000);
  };

  const clearStorage = () => {
    try {
      localStorage.removeItem('gogtePhotos');
      setPhotos([
        {
          id: 1,
          title: "Gogte Family's Ancestral Home",
          description: "This is our family's ancestral home where our forefathers lived. The house holds many precious memories and stories from generations past.",
          photographer: "Raju Gogte",
          category: "heritage",
          location: "Gogave, Satara",
          eventDate: "1950-01-01",
          tags: ["family", "history", "home", "heritage"],
          timestamp: "2 days ago",
          likes: 24,
          comments: 8,
          imageUrl: "https://images.unsplash.com/photo-1685702232056-657ddb88676a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFkaXRpb25hbCUyMGluZGlhbiUyMGZhbWlseSUyMHBob3RvcyUyMHZpbnRhZ2UlMjBzZXBpYXxlbnwxfHx8fDE3NTcyNjc2MDh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
          generation: "1950s",
          occasion: "House Photo",
          isCollection: false,
          photoCount: 1
        },
        {
          id: 2,
          title: "Grandparents' Wedding",
          description: "This is a precious photo of our grandparents' wedding ceremony. The traditional attire and decorations reflect the cultural heritage of our family.",
          photographer: "Sunita Gogte",
          category: "celebration",
          location: "Pune, Maharashtra",
          eventDate: "1960-05-15",
          tags: ["wedding", "traditional", "grandparents", "celebration"],
          timestamp: "1 week ago",
          likes: 45,
          comments: 15,
          imageUrl: "https://images.unsplash.com/photo-1719468452346-20bbb785de2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjB3ZWRkaW5nJTIwY2VsZWJyYXRpb24lMjB0cmFkaXRpb25hbHxlbnwxfHx8fDE3NTcyNjc2MTJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
          generation: "1960s",
          occasion: "Wedding",
          isCollection: false,
          photoCount: 1
        },
        {
          id: 3,
          title: "Ganesh Festival Celebration",
          description: "Our complete family photo from this year's Ganesh festival celebration. Everyone came together to celebrate this auspicious occasion with great joy and devotion.",
          photographer: "Anil Gogte",
          category: "celebration",
          location: "Pune, Maharashtra",
          eventDate: "2024-09-15",
          tags: ["festival", "family", "ganesh", "celebration"],
          timestamp: "3 days ago",
          likes: 32,
          comments: 12,
          imageUrl: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBmZXN0aXZhbCUyMGNlbGVicmF0aW9uJTIwZmFtaWx5JTIwcGhvdG9zZXxlbnwxfHx8fDE3NTcyNjc2MTV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
          generation: "2020s",
          occasion: "Festival",
          isCollection: false,
          photoCount: 1
        }
      ]);
      setStorageError(false);
      alert('Storage cleared successfully! You can now add new photos.');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  const handlePhotoClick = (photoItem) => {
    // Find the latest version of this photo item from the state
    const latestPhotoItem = photos.find(item => item.id === photoItem.id) || photoItem;
    setSelectedPhoto(latestPhotoItem);
    setShowDetailModal(true);
    setIsGalleryMode(true);
    
    // If it's a collection, create a flattened array of all images
    if (latestPhotoItem.isCollection && latestPhotoItem.imageUrls) {
      const allImages = latestPhotoItem.imageUrls.map((url, index) => ({
        ...latestPhotoItem,
        id: `${latestPhotoItem.id}-${index}`,
        imageUrl: url,
        isFromCollection: true,
        collectionId: latestPhotoItem.id
      }));
      
      setCurrentGalleryPhotos(allImages);
      setCurrentPhotoIndex(0);
      setSelectedPhoto(allImages[0]);
    } else {
      // Use filtered photos for single images
      setCurrentGalleryPhotos(filteredPhotos);
      const photoIndex = filteredPhotos.findIndex(photo => photo.id === photoItem.id);
      setCurrentPhotoIndex(photoIndex >= 0 ? photoIndex : 0);
    }
  };

  const handleNextPhoto = () => {
    if (currentPhotoIndex < currentGalleryPhotos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
      setSelectedPhoto(currentGalleryPhotos[currentPhotoIndex + 1]);
    }
  };

  const handlePrevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
      setSelectedPhoto(currentGalleryPhotos[currentPhotoIndex - 1]);
    }
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setIsGalleryMode(false);
    setCurrentPhotoIndex(0);
  };

  const handleLike = (photoId) => {
    setPhotos(prevPhotos => 
      prevPhotos.map(item => 
        item.id === photoId 
          ? { 
              ...item, 
              likes: item.likes + 1,
              likedBy: [...(item.likedBy || []), 'currentUser'] // Track who liked
            }
          : item
      )
    );
    
    // Also update selectedPhoto if it's the same item
    if (selectedPhoto && selectedPhoto.id === photoId) {
      setSelectedPhoto(prev => ({ 
        ...prev, 
        likes: prev.likes + 1,
        likedBy: [...(prev.likedBy || []), 'currentUser']
      }));
    }
  };

  const handleAddComment = (photoId, comment) => {
    const newComment = {
      id: Date.now(),
      text: comment,
      author: "You",
      timestamp: "Just now"
    };

    setPhotos(prevPhotos => 
      prevPhotos.map(item => 
        item.id === photoId 
          ? { 
              ...item, 
              comments: item.comments + 1,
              commentsList: [...(item.commentsList || []), newComment]
            }
          : item
      )
    );
    
    // Also update selectedPhoto if it's the same item
    if (selectedPhoto && selectedPhoto.id === photoId) {
      setSelectedPhoto(prev => ({ 
        ...prev, 
        comments: prev.comments + 1,
        commentsList: [...(prev.commentsList || []), newComment]
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-orange-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-amber-800 mb-2">Kulmandal Photo Gallery</h1>
              <p className="text-amber-700">Collection of precious family moments</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              {storageError && (
                <button
                  onClick={clearStorage}
                  className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Storage
                </button>
              )}
              <AddPhotoModal onAddPhoto={handleAddPhoto} />
            </div>
          </div>
        </div>
      </div>

      {/* Storage Warning Banner */}
      {storageError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <strong>Storage limit reached!</strong> Photos cannot be saved permanently. 
                <button 
                  onClick={clearStorage}
                  className="ml-2 underline hover:no-underline font-medium"
                >
                  Clear storage
                </button> to add new photos.
              </p>
            </div>
          </div>
        </div>
      )}

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
                  placeholder="Search photos..."
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
              <Camera className="w-8 h-8 text-amber-500 mr-3" />
              <div>
                <p className="text-sm text-amber-700">Total Photos</p>
                <p className="text-2xl font-bold text-amber-800">{photos.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-200">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-amber-500 mr-3" />
              <div>
                <p className="text-sm text-amber-700">Active Members</p>
                <p className="text-2xl font-bold text-amber-800">{new Set(photos.map(p => p.photographer)).size}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-200">
            <div className="flex items-center">
              <Star className="w-8 h-8 text-amber-500 mr-3" />
              <div>
                <p className="text-sm text-amber-700">Total Likes</p>
                <p className="text-2xl font-bold text-amber-800">{photos.reduce((sum, p) => sum + p.likes, 0)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-200">
            <div className="flex items-center">
              <Filter className="w-8 h-8 text-amber-500 mr-3" />
              <div>
                <p className="text-sm text-amber-700">Categories</p>
                <p className="text-2xl font-bold text-amber-800">{categories.length - 1}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPhotos.length > 0 ? (
            filteredPhotos.map(photoItem => (
              <div 
                key={photoItem.id} 
                onClick={() => handlePhotoClick(photoItem)}
                className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300"
              >
                {/* Image */}
                <div className="aspect-video bg-gradient-to-br from-amber-100 to-orange-200 relative">
                  {photoItem.imageUrl ? (
                    <img 
                      src={photoItem.imageUrl} 
                      alt={photoItem.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-amber-200 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Camera className="w-8 h-8 text-amber-600" />
                        </div>
                        <p className="text-amber-600 font-medium">No Image</p>
                      </div>
                    </div>
                  )}
                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {categories.find(cat => cat.value === photoItem.category)?.label || photoItem.category}
                    </span>
                  </div>
                  
                  {/* Collection Indicator */}
                  {photoItem.isCollection && photoItem.photoCount > 1 && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        {photoItem.photoCount} photos
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-amber-800 mb-2 line-clamp-2">
                    {photoItem.title}
                  </h3>
                  <p className="text-amber-700 mb-4 line-clamp-3">
                    {photoItem.description}
                  </p>
                  
                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-sm text-amber-600">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {photoItem.photographer}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {photoItem.timestamp}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center">
                        <Heart className="w-4 h-4 mr-1" />
                        {photoItem.likes}
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {photoItem.comments}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white rounded-xl shadow-sm border border-orange-200 p-12 text-center">
              <div className="text-amber-500 mb-4">
                <Camera className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-amber-800 mb-2">No Photos Found</h3>
              <p className="text-amber-700">No photos match your current search criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Photo Gallery Modal */}
      {showDetailModal && selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-orange-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-amber-800">Photo Gallery</h2>
                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
                  {currentPhotoIndex + 1} of {currentGalleryPhotos.length}
                </span>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-amber-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-amber-600" />
              </button>
            </div>

            {/* Gallery Content */}
            <div className="flex h-[calc(95vh-120px)]">
              {/* Main Photo Display */}
              <div className="flex-1 relative bg-black flex items-center justify-center">
                {selectedPhoto.imageUrl ? (
                  <img 
                    src={selectedPhoto.imageUrl} 
                    alt={selectedPhoto.title}
                    className="max-w-full max-h-full object-contain transition-all duration-500 ease-in-out"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-white">
                      <div className="w-20 h-20 bg-amber-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">📸</span>
                      </div>
                      <p className="text-amber-300 font-medium text-lg">No Image Available</p>
                    </div>
                  </div>
                )}
                
                {/* Navigation Arrows */}
                {currentGalleryPhotos.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevPhoto}
                      disabled={currentPhotoIndex === 0}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleNextPhoto}
                      disabled={currentPhotoIndex === currentGalleryPhotos.length - 1}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                  <span className="bg-amber-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                    {categories.find(cat => cat.value === selectedPhoto.category)?.label || selectedPhoto.category}
                  </span>
                </div>
              </div>

              {/* Photo Details Sidebar */}
              <div className="w-96 bg-white border-l border-orange-200 overflow-y-auto">
                <div className="p-6">

                  {/* Title and Meta */}
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-amber-800 mb-4 line-clamp-2">{selectedPhoto.title}</h1>
                    
                    <div className="space-y-3 text-amber-600 mb-4">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="text-sm"><strong>Posted:</strong> {selectedPhoto.timestamp}</span>
                      </div>
                      {selectedPhoto.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span className="text-sm"><strong>Location:</strong> {selectedPhoto.location}</span>
                        </div>
                      )}
                      {selectedPhoto.eventDate && (
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span className="text-sm"><strong>Event Date:</strong> {new Date(selectedPhoto.eventDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedPhoto.tags.map((tag, index) => (
                          <span key={index} className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-amber-800 mb-3">Description</h3>
                    <p className="text-amber-700 leading-relaxed text-sm">{selectedPhoto.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-orange-200 pt-4 mb-6">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleLike(selectedPhoto.id)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                          selectedPhoto.likedBy && selectedPhoto.likedBy.includes('currentUser')
                            ? 'bg-red-100 hover:bg-red-200 text-red-700'
                            : 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${selectedPhoto.likedBy && selectedPhoto.likedBy.includes('currentUser') ? 'fill-current' : ''}`} />
                        <span className="text-sm">{selectedPhoto.likes}</span>
                      </button>
                      <span className="flex items-center space-x-2 text-amber-600 text-sm">
                        <MessageCircle className="w-4 h-4" />
                        <span>{selectedPhoto.comments}</span>
                      </span>
                    </div>
                    
                    <button className="flex items-center space-x-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all duration-300 text-sm">
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Thumbnail Gallery */}
                  {currentGalleryPhotos.length > 1 && (
                    <div className="border-t border-orange-200 pt-4">
                      <h3 className="text-lg font-semibold text-amber-800 mb-3">All Photos</h3>
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {currentGalleryPhotos.map((photo, index) => (
                          <div
                            key={photo.id}
                            onClick={() => {
                              setCurrentPhotoIndex(index);
                              setSelectedPhoto(photo);
                            }}
                            className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-300 ${
                              index === currentPhotoIndex 
                                ? 'ring-2 ring-amber-500 scale-105' 
                                : 'hover:scale-105 hover:shadow-lg'
                            }`}
                          >
                            <img
                              src={photo.imageUrl}
                              alt={photo.title}
                              className="w-full h-20 object-cover"
                            />
                            {index === currentPhotoIndex && (
                              <div className="absolute inset-0 bg-amber-500 bg-opacity-20 flex items-center justify-center">
                                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
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
};

