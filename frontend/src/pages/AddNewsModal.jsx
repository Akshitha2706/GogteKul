import { useState, useRef, useEffect } from 'react';
import { Plus, X, Send, Upload, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { CustomSelect } from '../components/ui/select';
import { Label } from '../components/ui/label';
import api from '../utils/api';

export function AddNewsModal({ onAddNews }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('low');
  const [imageCaption, setImageCaption] = useState('');
  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleVansh, setVisibleVansh] = useState([]);
  const [vanshInput, setVanshInput] = useState('');
  const [isAllVanshSelected, setIsAllVanshSelected] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const fileInputRef = useRef(null);

  // Fetch author name from members collection on component mount
  useEffect(() => {
    const fetchAuthorName = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser.serNo) {
          console.warn('User serNo not found');
          return;
        }

        const response = await api.post('/api/family/members/by-sernos', {
          serNos: [currentUser.serNo]
        });

        if (response.data?.members && response.data.members.length > 0) {
          const member = response.data.members[0];
          const fullName = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim();
          setAuthorName(fullName);
        }
      } catch (error) {
        console.error('Error fetching author name:', error);
      }
    };

    if (open) {
      fetchAuthorName();
    }
  }, [open]);

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if image is too large (max 1200px on longest side)
          const maxSize = 1200;
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression (quality: 0.8)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedBase64);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleMainImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setMainImageFile(file);
    const compressedImage = await compressImage(file);
    setMainImagePreview(compressedImage);
  };

  const handleRemoveMainImage = () => {
    setMainImageFile(null);
    setMainImagePreview(null);
    setImageCaption('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddVanshNumbers = () => {
    if (isAllVanshSelected) {
      return;
    }
    if (!vanshInput.trim()) {
      return;
    }
    const entries = vanshInput
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (entries.length === 0) {
      return;
    }
    setVisibleVansh((prev) => {
      const next = new Set(prev);
      entries.forEach((value) => next.add(value));
      return Array.from(next);
    });
    setVanshInput('');
  };

  const handleRemoveVanshNumber = (value) => {
    setVisibleVansh((prev) => prev.filter((item) => item !== value));
  };

  const handleToggleAllVansh = () => {
    setIsAllVanshSelected((prev) => {
      const next = !prev;
      if (next) {
        setVisibleVansh([]);
        setVanshInput('');
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted with:', { title, content, category, mainImagePreview, authorName });
    
    if (title && summary && content && category && mainImagePreview) {
      setIsSubmitting(true);
      
      try {
        const visibleVanshNumbers = isAllVanshSelected ? [] : visibleVansh;
        const newsData = {
          title,
          summary,
          content,
          category,
          priority,
          publishDate: new Date().toISOString(),
          authorName,
          images: {
            url: mainImagePreview,
            caption: imageCaption,
          },
          visibleToAllVansh: isAllVanshSelected,
          visibleVanshNumbers,
        };
        console.log('Calling onAddNews with:', newsData);
        onAddNews(newsData);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setTitle('');
        setSummary('');
        setContent('');
        setCategory('');
        setPriority('low');
        setImageCaption('');
        setMainImageFile(null);
        setMainImagePreview(null);
        setVisibleVansh([]);
        setVanshInput('');
        setIsAllVanshSelected(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setOpen(false);
      } catch (error) {
        console.error('Error submitting news:', error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      console.log('Form validation failed:', {
        title: !!title,
        summary: !!summary,
        content: !!content,
        category: !!category,
        mainImage: !!mainImagePreview,
      });
    }
  };

  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 text-lg font-semibold"
      >
        <Plus className="w-5 h-5 mr-2" />
        Share Family News
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[700px] bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-orange-900 flex items-center mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center mr-3">
                <Plus className="w-5 h-5 text-white" />
              </div>
              Share Your Family Story
            </DialogTitle>
            <p className="text-orange-700 text-sm">Share detailed information about family events, achievements, celebrations, and memorable moments</p>
          </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-orange-900">{t('newsPage.addNewsModal.newsTitle')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('newsPage.addNewsModal.newsTitlePlaceholder')}
              className="border-orange-200 focus:border-orange-400 bg-white"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="summary" className="text-orange-900">{t('newsPage.addNewsModal.summary')}</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t('newsPage.addNewsModal.summaryPlaceholder')}
              className="border-orange-200 focus:border-orange-400 bg-white min-h-[80px]"
              maxLength={180}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-orange-900">{t('newsPage.addNewsModal.category')}</Label>
              <CustomSelect 
                value={category} 
                onValueChange={setCategory} 
                placeholder={t('newsPage.addNewsModal.selectCategory')}
                className="border-orange-200 focus:border-orange-400 bg-white"
              >
                <div value="celebration">{t('newsPage.categories.celebration')}</div>
                <div value="achievement">{t('newsPage.categories.achievement')}</div>
                <div value="announcement">{t('newsPage.categories.announcement')}</div>
                <div value="tradition">{t('newsPage.categories.tradition')}</div>
                <div value="milestone">{t('newsPage.categories.milestone')}</div>
                <div value="reunion">{t('newsPage.categories.reunion')}</div>
                <div value="memory">{t('newsPage.categories.memory')}</div>
                <div value="general">{t('newsPage.categories.general')}</div>
              </CustomSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-orange-900">{t('newsPage.addNewsModal.priority')}</Label>
              <CustomSelect
                value={priority}
                onValueChange={setPriority}
                placeholder={t('newsPage.addNewsModal.selectPriority')}
                className="border-orange-200 focus:border-orange-400 bg-white"
              >
                <div value="high">{t('newsPage.priorityOptions.high')}</div>
                <div value="medium">{t('newsPage.priorityOptions.medium')}</div>
                <div value="low">{t('newsPage.priorityOptions.low')}</div>
              </CustomSelect>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="content" className="text-orange-900">{t('newsPage.addNewsModal.content')}</Label>
              <span className="text-sm text-orange-600">{content.length}/1000</span>
            </div>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('newsPage.addNewsModal.contentPlaceholder')}
              className="border-orange-200 focus:border-orange-400 bg-white min-h-[140px]"
              maxLength={1000}
              required
            />
          </div>
          


          <div className="space-y-2">
            <Label className="text-orange-900">Allowed Vansh Numbers</Label>
            <div className="flex items-center gap-3">
              <input
                id="allVansh"
                type="checkbox"
                checked={isAllVanshSelected}
                onChange={handleToggleAllVansh}
                className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-2 focus:ring-orange-500"
              />
              <Label htmlFor="allVansh" className="text-orange-800 font-medium">Visible to all vansh</Label>
            </div>
            {!isAllVanshSelected && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={vanshInput}
                  onChange={(e) => setVanshInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddVanshNumbers();
                    }
                  }}
                  placeholder="Add vansh numbers (e.g., 1, 2, 3)"
                  className="border-orange-200 focus:border-orange-400 bg-white"
                />
                <Button
                  type="button"
                  onClick={handleAddVanshNumbers}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Add
                </Button>
              </div>
            )}
            {isAllVanshSelected && (
              <div className="bg-amber-100 text-amber-800 px-3 py-2 rounded-lg text-sm font-medium">All vansh will be able to view this news</div>
            )}
            {!isAllVanshSelected && visibleVansh.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {visibleVansh.map((number) => (
                  <span key={number} className="flex items-center bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm">
                    #{number}
                    <button
                      type="button"
                      onClick={() => handleRemoveVanshNumber(number)}
                      className="ml-2 text-amber-600 hover:text-amber-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-orange-900">Feature Image Upload</Label>
              {mainImagePreview && (
                <div className="relative">
                  <img
                    src={mainImagePreview}
                    alt="Feature preview"
                    className="w-full h-48 object-cover rounded-lg border border-orange-200"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveMainImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleMainImageUpload}
                className="hidden"
                id="featureImageUpload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Feature Image
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageCaption" className="text-orange-900">{t('newsPage.addNewsModal.imageCaption')}</Label>
              <Input
                id="imageCaption"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                placeholder={t('newsPage.addNewsModal.imageCaption')}
                className="border-orange-200 focus:border-orange-400 bg-white"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <X className="w-4 h-4 mr-2" />
              {t('newsPage.addNewsModal.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t('newsPage.addNewsModal.shareNews')}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}