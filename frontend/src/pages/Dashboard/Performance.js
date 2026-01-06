import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
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
  Target, Plus, CheckCircle2, Clock, AlertCircle,
  TrendingUp, Calendar, MessageSquare, Edit2
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Performance = () => {
  const { user, language } = useAuth();
  const { t } = useTranslation(language);
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsRes, tasksRes] = await Promise.all([
        axios.get(`${API_URL}/performance/my-goals`),
        axios.get(`${API_URL}/tasks/my-tasks`)
      ]);
      setGoals(goalsRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    try {
      await axios.post(`${API_URL}/performance/goals`, newGoal);
      toast.success('Goal created successfully');
      setDialogOpen(false);
      setNewGoal({ title: '', description: '', target_date: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create goal');
    }
  };

  const handleUpdateGoalProgress = async (goalId, progress) => {
    try {
      await axios.put(`${API_URL}/performance/goals/${goalId}`, { 
        progress,
        status: progress >= 100 ? 'completed' : 'in_progress'
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to update progress');
    }
  };

  const handleUpdateTaskStatus = async (taskId, status) => {
    try {
      await axios.put(`${API_URL}/tasks/${taskId}`, { status });
      toast.success('Task updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'badge-error';
      case 'medium':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  };

  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const avgProgress = goals.length 
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="performance-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-['Manrope']">
            {t('performance')}
          </h2>
          <p className="text-slate-500 mt-1">
            Track your goals, tasks, and performance metrics
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-700 hover:bg-blue-800 gap-2" data-testid="add-goal-btn">
              <Plus className="w-4 h-4" />
              {t('addGoal')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Set a new performance goal to track your progress
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Goal Title</Label>
                <Input
                  placeholder="e.g., Complete React certification"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  data-testid="goal-title-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe your goal..."
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  data-testid="goal-description-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={newGoal.target_date}
                  onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                  data-testid="goal-date-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateGoal}
                className="bg-blue-700 hover:bg-blue-800"
                data-testid="save-goal-btn"
              >
                Create Goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dashboard-card card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="stats-icon-bg bg-blue-100">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{goals.length}</p>
                <p className="text-sm text-slate-500">Total Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="stats-icon-bg bg-emerald-100">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{completedGoals}</p>
                <p className="text-sm text-slate-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="stats-icon-bg bg-amber-100">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{tasks.filter(t => t.status !== 'completed').length}</p>
                <p className="text-sm text-slate-500">Pending Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="stats-icon-bg bg-purple-100">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{avgProgress}%</p>
                <p className="text-sm text-slate-500">Avg Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals */}
        <Card className="dashboard-card" data-testid="goals-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              {t('goals')} / KPIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {goals.length > 0 ? (
              <div className="space-y-4">
                {goals.map((goal) => (
                  <div 
                    key={goal.id}
                    className="p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(goal.status)}
                        <h4 className="font-medium text-slate-900">{goal.title}</h4>
                      </div>
                      <span className={`badge ${
                        goal.status === 'completed' ? 'badge-success' : 
                        goal.status === 'overdue' ? 'badge-error' : 'badge-warning'
                      }`}>
                        {goal.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">{goal.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Progress</span>
                        <span className="font-medium">{goal.progress}%</span>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Target: {goal.target_date}
                        </span>
                        <div className="flex gap-1">
                          {[25, 50, 75, 100].map((p) => (
                            <button
                              key={p}
                              onClick={() => handleUpdateGoalProgress(goal.id, p)}
                              className={`px-2 py-0.5 text-xs rounded ${
                                goal.progress >= p 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {p}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {goal.feedback && (
                      <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                        <div className="flex items-center gap-1 text-blue-700 mb-1">
                          <MessageSquare className="w-3 h-3" />
                          <span className="font-medium">Feedback</span>
                        </div>
                        <p className="text-blue-600">{goal.feedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No goals set yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Create your first goal to start tracking progress
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="dashboard-card" data-testid="tasks-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              Task Tracker
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div 
                    key={task.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      task.status === 'completed' 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium ${
                            task.status === 'completed' 
                              ? 'text-slate-500 line-through' 
                              : 'text-slate-900'
                          }`}>
                            {task.title}
                          </h4>
                          <span className={`badge ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {task.due_date}
                      </span>
                      <Select
                        value={task.status}
                        onValueChange={(value) => handleUpdateTaskStatus(task.id, value)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No tasks assigned</p>
                <p className="text-sm text-slate-400 mt-1">
                  Tasks assigned to you will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Score */}
      <Card className="dashboard-card" data-testid="performance-score">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Performance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#2563eb"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${avgProgress * 4.4} 440`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-slate-900">{avgProgress}</span>
                <span className="text-sm text-slate-500">out of 100</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{completedGoals}</p>
              <p className="text-sm text-slate-500">Goals Met</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{tasks.filter(t => t.status === 'completed').length}</p>
              <p className="text-sm text-slate-500">Tasks Done</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">4.5</p>
              <p className="text-sm text-slate-500">Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Performance;
