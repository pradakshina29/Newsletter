import React, { useState, useEffect } from 'react';
import { UserSession, ProjectData } from '../types/editor';
import { ArrowLeft, BarChart, Users, FileText, CheckCircle, XCircle, Clock, RefreshCw, Sun, Moon } from 'lucide-react';

interface AdminPanelProps {
  user: UserSession;
  onBackToDashboard: () => void;
  onLogout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

interface ActivityLog {
  id: number;
  userId: number;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  timestamp: string;
}

interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  enabled: boolean;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user, onBackToDashboard, darkMode, toggleDarkMode }) => {
  const [tab, setTab] = useState<'approvals' | 'users' | 'logs'>('approvals');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    pendingApprovals: 0,
    totalTemplates: 0
  });

  const [pendingNewsletters, setPendingNewsletters] = useState<ProjectData[]>([]);
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [actioningId, setActioningId] = useState<number | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        setStats(await response.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchApprovals = async () => {
    try {
      const response = await fetch('/api/admin/pending', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        setPendingNewsletters(await response.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        setUsersList(await response.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/admin/logs', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        setActivityLogs(await response.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTabDetails = async () => {
    setLoading(true);
    await fetchStats();
    if (tab === 'approvals') await fetchApprovals();
    else if (tab === 'users') await fetchUsers();
    else if (tab === 'logs') await fetchLogs();
    setLoading(false);
  };

  useEffect(() => {
    fetchTabDetails();
  }, [tab]);

  const handleApprove = async (id: number) => {
    setActioningId(id);
    try {
      const response = await fetch(`/api/admin/newsletters/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        alert("Newsletter approved and published successfully!");
        fetchTabDetails();
      } else {
        alert("Failed to approve newsletter.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: number) => {
    setActioningId(id);
    try {
      const response = await fetch(`/api/admin/newsletters/${id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        alert("Newsletter rejected. Returned to author as draft.");
        fetchTabDetails();
      } else {
        alert("Failed to reject newsletter.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActioningId(null);
    }
  };

  const handleToggleUserStatus = async (userRecord: UserRecord) => {
    try {
      const response = await fetch(`/api/admin/users/${userRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          enabled: (!userRecord.enabled).toString()
        })
      });
      if (response.ok) {
        fetchUsers();
      } else {
        alert("Failed to update user status.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUserRoleChange = async (userId: number, roleValue: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ role: roleValue })
      });
      if (response.ok) {
        fetchUsers();
        alert("User role updated successfully.");
      } else {
        alert("Failed to update user role.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Admin header */}
      <header className="sticky top-0 z-40 bg-secondary text-white px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBackToDashboard}
            className="p-2 hover:bg-white/5 rounded-lg text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-bold tracking-tight text-base leading-none">Administration Console</h2>
            <p className="text-[10px] text-slate-400 mt-1 capitalize">{user.role.toLowerCase()} control room</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-white/5 rounded-lg text-slate-300 hover:text-white transition-all"
            title="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button 
            onClick={fetchTabDetails} 
            className="p-2 hover:bg-white/5 rounded-lg text-slate-300 hover:text-white transition-all"
            title="Refresh panel logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Admin Main Body */}
      <main className="flex-grow p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Statistics Panels Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center space-x-3.5">
            <div className="p-3 bg-blue-100 text-primary rounded-xl"><Users className="w-5 h-5" /></div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Users</span>
              <span className="text-xl font-bold text-slate-700 leading-none block mt-1">{stats.totalUsers}</span>
            </div>
          </div>
          <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center space-x-3.5">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><FileText className="w-5 h-5" /></div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Newsletters</span>
              <span className="text-xl font-bold text-slate-700 leading-none block mt-1">{stats.totalProjects}</span>
            </div>
          </div>
          <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center space-x-3.5 animate-pulse">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><Clock className="w-5 h-5" /></div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pending Approvals</span>
              <span className="text-xl font-bold text-amber-600 leading-none block mt-1">{stats.pendingApprovals}</span>
            </div>
          </div>
          <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center space-x-3.5">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl"><BarChart className="w-5 h-5" /></div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Design Templates</span>
              <span className="text-xl font-bold text-slate-700 leading-none block mt-1">{stats.totalTemplates}</span>
            </div>
          </div>
        </div>

        {/* Tab strip navigation */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200/50 flex space-x-2 max-w-sm">
          <button
            onClick={() => setTab('approvals')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl tracking-wider transition-all ${
              tab === 'approvals' ? 'bg-primary text-white shadow' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Approvals ({pendingNewsletters.length})
          </button>
          <button
            onClick={() => setTab('users')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl tracking-wider transition-all ${
              tab === 'users' ? 'bg-primary text-white shadow' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            User Controls
          </button>
          <button
            onClick={() => setTab('logs')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl tracking-wider transition-all ${
              tab === 'logs' ? 'bg-primary text-white shadow' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Activity Logs
          </button>
        </div>

        {/* Content Box */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 space-y-3">
              <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Loading details...</span>
            </div>
          ) : (
            <div className="p-6">
              
              {/* Tab 1: Approvals */}
              {tab === 'approvals' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-secondary">Pending Newsletter Approvals</h3>
                  {pendingNewsletters.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 space-y-2">
                      <CheckCircle className="w-8 h-8 mx-auto text-green-500/60" />
                      <p className="text-xs">All publications cleared! No pending approvals.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {pendingNewsletters.map(nl => (
                        <div key={nl.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-700">{nl.name}</h4>
                            <p className="text-xs text-slate-400 font-medium">
                              Author: <span className="text-slate-600 font-bold">{nl.ownerName}</span> ({nl.department})
                            </p>
                            <p className="text-[10px] text-slate-400">Submitted: {new Date(nl.updatedAt || '').toLocaleString()}</p>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <button
                              disabled={actioningId === nl.id}
                              onClick={() => handleApprove(nl.id!)}
                              className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center space-x-1.5 shadow"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              disabled={actioningId === nl.id}
                              onClick={() => handleReject(nl.id!)}
                              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold text-xs transition-colors flex items-center space-x-1.5 border border-red-200"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: User controls */}
              {tab === 'users' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-secondary">Platform User Management</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold">
                          <th className="py-2.5">Name</th>
                          <th className="py-2.5">Email</th>
                          <th className="py-2.5">Department</th>
                          <th className="py-2.5">System Role</th>
                          <th className="py-2.5">Account Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {usersList.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 font-semibold text-slate-700">{u.name}</td>
                            <td className="py-3 text-slate-500 font-medium">{u.email}</td>
                            <td className="py-3 text-slate-500 font-medium">{u.department}</td>
                            <td className="py-3">
                              {/* If administrator, restrict role changes for safety */}
                              {u.email === 'admin@kprcas.ac.in' ? (
                                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px]">ADMIN</span>
                              ) : (
                                <select
                                  value={u.role}
                                  onChange={e => handleUserRoleChange(u.id, e.target.value)}
                                  className="border border-slate-200 bg-white rounded-lg p-1 text-[11px] focus:outline-none"
                                >
                                  <option value="STUDENT">STUDENT</option>
                                  <option value="FACULTY">FACULTY</option>
                                  <option value="ADMIN">ADMIN</option>
                                </select>
                              )}
                            </td>
                            <td className="py-3">
                              {u.email === 'admin@kprcas.ac.in' ? (
                                <span className="text-green-600 font-bold">ACTIVE</span>
                              ) : (
                                <button
                                  onClick={() => handleToggleUserStatus(u)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                    u.enabled 
                                      ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                                      : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                  }`}
                                >
                                  {u.enabled ? 'Enabled' : 'Disabled'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: System Logs */}
              {tab === 'logs' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-secondary">System Activity Audit Log</h3>
                  <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                    {activityLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">No logs generated yet.</p>
                    ) : (
                      activityLogs.map(log => (
                        <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start justify-between text-xs hover:border-slate-200 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-700">{log.userName}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-500 font-bold uppercase tracking-wider">{log.userRole}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-bold text-primary uppercase tracking-wide text-[10px]">{log.action}</span>
                            </div>
                            <p className="text-slate-600 leading-relaxed font-medium">{log.details}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(log.timestamp).toLocaleTimeString()} - {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
