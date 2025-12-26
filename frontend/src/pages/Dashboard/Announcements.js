import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
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
  Megaphone, Plus, Calendar, Tag, Search, Filter,
  Bell, AlertTriangle, PartyPopper, Info
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Announcements = () => {
  const { user, language } = useAuth();
  const { t } = useTranslation(language);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    category: 'general'
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
      await axios.post(`${API_URL}/announcements`, newAnnouncement);
      toast.success('Announcement created successfully');
      setDialogOpen(false);
      setNewAnnouncement({ title: '', content: '', category: 'general' });
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to create announcement');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await axios.delete(`${API_URL}/announcements/${id}`);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'important':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'event':
        return <PartyPopper className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-slate-600" />;
    }
  };

  const getCategoryStyle = (category) => {
    switch (category) {
      case 'important':
        return 'border-l-rose-500 bg-rose-50/50';
      case 'event':
        return 'border-l-blue-500 bg-blue-50/50';
      default:
        return 'border-l-slate-400 bg-slate-50/50';
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
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
            Stay updated with the latest news and announcements
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
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
                <DialogDescription>
                  Create a new announcement for all employees
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
                  <Label>{t('content')}</Label>
                  <Textarea
                    placeholder="Write your announcement..."
                    className="min-h-[150px]"
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    data-testid="announcement-content-input"
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

      {/* Announcements List */}
      {filteredAnnouncements.length > 0 ? (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement, index) => (
            <Card 
              key={announcement.id}
              className={`dashboard-card border-l-4 ${getCategoryStyle(announcement.category)} animate-fade-in`}
              style={{ animationDelay: `${index * 0.1}s` }}
              data-testid={`announcement-${announcement.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${
                      announcement.category === 'important' ? 'bg-rose-100' :
                      announcement.category === 'event' ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      {getCategoryIcon(announcement.category)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 font-['Manrope']">
                          {announcement.title}
                        </h3>
                        <span className={`badge ${
                          announcement.category === 'important' ? 'badge-error' :
                          announcement.category === 'event' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                          'badge-secondary'
                        }`}>
                          {announcement.category}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(announcement.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {user?.role === 'hr_manager' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
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
