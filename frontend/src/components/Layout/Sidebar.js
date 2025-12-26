import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import { 
  LayoutDashboard, UserCircle, Users, Clock, Calendar, 
  Target, DollarSign, Megaphone, LogOut, Building2, X, Settings, Shield
} from 'lucide-react';
import { ScrollArea } from '../../components/ui/scroll-area';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout, language } = useAuth();
  const { t } = useTranslation(language);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { 
      icon: LayoutDashboard, 
      label: t('dashboard'), 
      path: '/dashboard',
      roles: ['intern', 'employee', 'hr_manager']
    },
    { 
      icon: Users, 
      label: t('recruitment'), 
      path: '/dashboard/recruitment',
      roles: ['intern', 'employee', 'hr_manager']
    },
    { 
      icon: UserCircle, 
      label: 'Personal Information', 
      path: '/dashboard/employee-data',
      roles: ['intern', 'employee', 'hr_manager']
    },
    { 
      icon: DollarSign, 
      label: t('payroll'), 
      path: '/dashboard/payroll',
      roles: ['intern', 'employee', 'hr_manager']
    },
    { 
      icon: Target, 
      label: t('performance'), 
      path: '/dashboard/performance',
      roles: ['intern', 'employee', 'hr_manager']
    },
    { 
      icon: Clock, 
      label: t('attendance'), 
      path: '/dashboard/attendance',
      roles: ['intern', 'employee', 'hr_manager']
    },
    { 
      icon: Megaphone, 
      label: t('announcements'), 
      path: '/dashboard/announcements',
      roles: ['intern', 'employee', 'hr_manager']
    },
    { 
      icon: Shield, 
      label: 'Mentorship & Appointments', 
      path: '/dashboard/mentorship',
      roles: ['hr_manager']
    },
  ];

  const filteredItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transform transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white font-['Manrope']">HR Nexus</span>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-slate-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 sidebar-scroll">
          <nav className="p-2 space-y-1">
            {filteredItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-r-full mr-2 ${
                    isActive
                      ? 'bg-blue-900/20 text-blue-400 border-l-4 border-blue-500'
                      : 'hover:text-white hover:bg-slate-800/50'
                  }`
                }
                data-testid={`nav-${item.path.split('/').pop()}`}
              >
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-slate-800">
          <NavLink
            to="/dashboard/profile"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-r-full mr-2 ${
                isActive
                  ? 'bg-blue-900/20 text-blue-400 border-l-4 border-blue-500'
                  : 'hover:text-white hover:bg-slate-800/50'
              }`
            }
            data-testid="nav-profile"
          >
            <Settings className="w-5 h-5" strokeWidth={1.5} />
            <span>{t('profile')}</span>
          </NavLink>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 transition-colors rounded-r-full mr-2"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" strokeWidth={1.5} />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
