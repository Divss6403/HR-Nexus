import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  Megaphone, Plus, Calendar, Search, Filter, Eye,
  AlertTriangle, PartyPopper, Info, Clock, Tag, ArrowLeft, Trash2
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Announcements = () => {
  const { user, language } = useAuth();
  const { t } = useTranslation(language);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    category: 'general',
    cover_image: '',
    tags: ''
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get(`${API_URL}/announcements`);
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    try {
      await axios.post(`${API_URL}/announcements`, {
        ...newAnnouncement,
        tags: newAnnouncement.tags.split(',').map(t => t.trim()).filter(Boolean)
      });
      toast.success('Announcement published successfully');
      setDialogOpen(false);
      setNewAnnouncement({ title: '', content: '', category: 'general', cover_image: '', tags: '' });
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to create announcement');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await axios.delete(`${API_URL}/announcements/${id}`);
      toast.success('Announcement deleted');
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'important':
        return <AlertTriangle className="w-4 h-4" />;
      case 'event':
        return <PartyPopper className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'important':
        return 'bg-rose-500';
      case 'event':
        return 'bg-blue-500';
      default:
        return 'bg-slate-500';
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderMarkdown = (text) => {
    // Simple markdown-like rendering
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-slate-900 my-2">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith('*') && line.endsWith('*')) {
          return <p key={i} className="italic text-slate-600 my-2">{line.slice(1, -1)}</p>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <li key={i} className="ml-4 text-slate-700">{line.slice(2)}</li>;
        }
        if (line.match(/^\d+\./)) {
          return <li key={i} className="ml-4 text-slate-700 list-decimal">{line.slice(line.indexOf('.') + 2)}</li>;
        }
        if (line.trim() === '') {
          return <br key={i} />;
        }
        return <p key={i} className="text-slate-700 my-1">{line}</p>;
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  // Blog Detail View
  if (selectedAnnouncement) {
    return (
      <div className="max-w-4xl mx-auto" data-testid="announcement-detail">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedAnnouncement(null)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Announcements
        </Button>

        <article className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Cover Image */}
          {selectedAnnouncement.cover_image && (
            <div className="h-64 md:h-80 overflow-hidden">
              <img 
                src={selectedAnnouncement.cover_image} 
                alt={selectedAnnouncement.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8">
            {/* Category Badge */}
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-sm font-medium ${getCategoryColor(selectedAnnouncement.category)}`}>
                {getCategoryIcon(selectedAnnouncement.category)}
                {selectedAnnouncement.category.charAt(0).toUpperCase() + selectedAnnouncement.category.slice(1)}
              </span>
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Eye className="w-4 h-4" />
                {selectedAnnouncement.views} views
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-['Manrope'] mb-4">
              {selectedAnnouncement.title}
            </h1>

            {/* Author & Date */}
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-200">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-blue-600 text-white">
                  {selectedAnnouncement.author_name?.charAt(0) || 'H'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-slate-900">{selectedAnnouncement.author_name}</p>
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedAnnouncement.created_at)}
                </p>
              </div>

              {user?.role === 'hr_manager' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="ml-auto text-rose-600 hover:bg-rose-50"
                  onClick={() => handleDeleteAnnouncement(selectedAnnouncement.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>

            {/* Content */}
            <div className="prose prose-slate max-w-none">
              {renderMarkdown(selectedAnnouncement.content)}
            </div>

            {/* Tags */}
            {selectedAnnouncement.tags && selectedAnnouncement.tags.length > 0 && (
              <div className="flex items-center gap-2 mt-8 pt-8 border-t border-slate-200">
                <Tag className="w-4 h-4 text-slate-400" />
                <div className="flex flex-wrap gap-2">
                  {selectedAnnouncement.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="announcements-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-['Manrope']">
            {t('announcements')}
          </h2>
          <p className="text-slate-500 mt-1">
            Stay updated with the latest news and company updates
          </p>
        </div>
        {user?.role === 'hr_manager' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-700 hover:bg-blue-800 gap-2" data-testid="new-announcement-btn">
                <Plus className="w-4 h-4" />
                {t('newAnnouncement')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
                <DialogDescription>
                  Write a new announcement for all employees. Use markdown-like formatting for better readability.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t('title')}</Label>
                  <Input
                    placeholder="Announcement title"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    data-testid="announcement-title-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('category')}</Label>
                    <Select 
                      value={newAnnouncement.category} 
                      onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, category: v })}
                    >
                      <SelectTrigger data-testid="announcement-category-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{t('general')}</SelectItem>
                        <SelectItem value="important">{t('important')}</SelectItem>
                        <SelectItem value="event">{t('event')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cover Image URL (optional)</Label>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={newAnnouncement.cover_image}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, cover_image: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('content')}</Label>
                  <Textarea
                    placeholder="Write your announcement... Use **bold** for headings, - for bullet points"
                    className="min-h-[200px]"
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    data-testid="announcement-content-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input
                    placeholder="news, update, important"
                    value={newAnnouncement.tags}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, tags: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateAnnouncement}
                  className="bg-blue-700 hover:bg-blue-800"
                  data-testid="publish-announcement-btn"
                >
                  Publish Announcement
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card className="dashboard-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search announcements..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="search-announcements"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-40" data-testid="category-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">{t('general')}</SelectItem>
                <SelectItem value="important">{t('important')}</SelectItem>
                <SelectItem value="event">{t('event')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Blog Grid */}
      {filteredAnnouncements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAnnouncements.map((announcement, index) => (
            <article 
              key={announcement.id}
              onClick={() => setSelectedAnnouncement(announcement)}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
              data-testid={`announcement-${announcement.id}`}
            >
              {/* Cover Image */}
              {announcement.cover_image ? (
                <div className="h-40 overflow-hidden">
                  <img 
                    src={announcement.cover_image} 
                    alt={announcement.title}
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                  />
                </div>
              ) : (
                <div className={`h-24 ${getCategoryColor(announcement.category)} flex items-center justify-center`}>
                  <Megaphone className="w-10 h-10 text-white/50" />
                </div>
              )}

              <div className="p-5">
                {/* Category & Views */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getCategoryColor(announcement.category)}`}>
                    {getCategoryIcon(announcement.category)}
                    {announcement.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Eye className="w-3 h-3" />
                    {announcement.views}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-slate-900 font-['Manrope'] line-clamp-2 mb-2">
                  {announcement.title}
                </h3>

                {/* Excerpt */}
                <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                  {announcement.content.substring(0, 120)}...
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                        {announcement.author_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-slate-500">{announcement.author_name}</span>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(announcement.created_at)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Card className="dashboard-card">
          <CardContent className="py-12">
            <div className="text-center">
              <Megaphone className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Announcements</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                {searchQuery || categoryFilter !== 'all' 
                  ? 'No announcements match your search criteria'
                  : 'There are no announcements at the moment. Check back later for updates.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Announcements;
