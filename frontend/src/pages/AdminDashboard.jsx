import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield, Users, FileText, Calendar, Network, Edit, Trash2, Plus, Eye, Key,
  BarChart3, TrendingUp, AlertCircle, CheckCircle, Clock, X
} from 'lucide-react';
import adminApi from '../utils/adminApi';
import SearchFilterBar from '../components/admin/SearchFilterBar';
import '../styles/admin-dashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalNews: 0,
    totalEvents: 0,
    pendingForms: 0,
    totalLoginAccounts: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Tab-specific states
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [hierarchyForms, setHierarchyForms] = useState([]);
  const [loginDetails, setLoginDetails] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [tempMembers, setTempMembers] = useState([]);

  // Search & filter states
  const [searchTerms, setSearchTerms] = useState({});
  const [filters, setFilters] = useState({});

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await adminApi.get('/stats');
      setStats(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    setSearchTerms({});
    setFilters({});

    try {
      setLoading(true);
      switch (tab) {
        case 'users':
          const usersRes = await adminApi.get('/logins');
          setUsers(Array.isArray(usersRes.data.data) ? usersRes.data.data : []);
          break;
        case 'members':
          const membersRes = await adminApi.get('/members');
          setMembers(Array.isArray(membersRes.data.data) ? membersRes.data.data : []);
          break;
        case 'news':
          const newsRes = await adminApi.get('/news');
          setNews(Array.isArray(newsRes.data.data) ? newsRes.data.data : []);
          break;
        case 'events':
          const eventsRes = await adminApi.get('/events');
          setEvents(Array.isArray(eventsRes.data.data) ? eventsRes.data.data : []);
          break;
        case 'hierarchy-forms':
          const formsRes = await adminApi.get('/hierarchy-forms');
          setHierarchyForms(Array.isArray(formsRes.data.data) ? formsRes.data.data : []);
          break;
        case 'relationships':
          // No backend endpoint available yet
          setRelationships([]);
          break;
        case 'temp-members':
          // No backend endpoint available yet
          setTempMembers([]);
          break;
        case 'login-details':
          const loginRes = await adminApi.get('/logins');
          setLoginDetails(Array.isArray(loginRes.data.data) ? loginRes.data.data : []);
          break;
        default:
          break;
      }
      setError(null);
    } catch (err) {
      console.error(`Failed to load ${tab}:`, err);
      setError(`Failed to load ${tab}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, endpoint) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await adminApi.delete(`/${endpoint}/${id}`);
      setSuccessMessage('Item deleted successfully');
      handleTabChange(activeTab);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to delete item');
    }
  };

  const handleApprove = async (id, endpoint) => {
    try {
      await adminApi.post(`/${endpoint}/${id}/approve`);
      setSuccessMessage('Item approved successfully');
      handleTabChange(activeTab);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to approve item');
    }
  };

  const renderDashboardOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatCard title="Total Users" value={stats.totalUsers || 0} icon={<Users className="w-6 h-6" />} color="blue" />
      <StatCard title="Family Members" value={stats.totalMembers || 0} icon={<Users className="w-6 h-6" />} color="green" />
      <StatCard title="News Articles" value={stats.totalNews || 0} icon={<FileText className="w-6 h-6" />} color="orange" />
      <StatCard title="Scheduled Events" value={stats.totalEvents || 0} icon={<Calendar className="w-6 h-6" />} color="red" />
      <StatCard title="Pending Forms" value={stats.pendingRegistrations || 0} icon={<Clock className="w-6 h-6" />} color="yellow" />
    </div>
  );

  const renderUsersTab = () => (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">System Users</h3>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={18} /> Add User
        </button>
      </div>
      <SearchFilterBar 
        searchTerm={searchTerms.users || ''}
        onSearchChange={(val) => setSearchTerms({...searchTerms, users: val})}
        filters={filters.users || {}}
        onFilterChange={(key, val) => setFilters({...filters, users: {...(filters.users || {}), [key]: val}})}
        filterOptions={{
          role: ['admin', 'dba', 'user'],
          isActive: { true: 'Active', false: 'Inactive' }
        }}
      />
      <div className="bg-white rounded-lg overflow-hidden shadow">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? users.map(user => (
              <tr key={user._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{`${user.firstName} ${user.lastName}`}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${user.role === 'admin' ? 'bg-red-100 text-red-800' : user.role === 'dba' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.isActive ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="text-blue-500 hover:text-blue-700"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(user._id, 'users')} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMembersTab = () => (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Family Members</h3>
        <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={18} /> Add Member
        </button>
      </div>
      <SearchFilterBar 
        searchTerm={searchTerms.members || ''}
        onSearchChange={(val) => setSearchTerms({...searchTerms, members: val})}
        filters={filters.members || {}}
        onFilterChange={(key, val) => setFilters({...filters, members: {...(filters.members || {}), [key]: val}})}
        filterOptions={{
          gender: { M: 'Male', F: 'Female' },
          isAlive: { true: 'Alive', false: 'Deceased' }
        }}
      />
      <div className="bg-white rounded-lg overflow-hidden shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Serial No</th>
              <th className="px-4 py-3 text-left font-semibold">Gender</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length > 0 ? members.map(member => (
              <tr key={member._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{member.firstName} {member.lastName}</td>
                <td className="px-4 py-3">{member.serNo}</td>
                <td className="px-4 py-3">{member.gender}</td>
                <td className="px-4 py-3">{member.isAlive ? 'Alive' : 'Deceased'}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="text-blue-500 hover:text-blue-700"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(member._id, 'family-members')} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No members found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderNewsTab = () => (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">News Articles</h3>
        <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={18} /> Add News
        </button>
      </div>
      <SearchFilterBar 
        searchTerm={searchTerms.news || ''}
        onSearchChange={(val) => setSearchTerms({...searchTerms, news: val})}
        filters={filters.news || {}}
        onFilterChange={(key, val) => setFilters({...filters, news: {...(filters.news || {}), [key]: val}})}
        filterOptions={{
          category: ['General', 'Event', 'Family', 'Heritage'],
          isPublished: { true: 'Published', false: 'Draft' }
        }}
      />
      <div className="bg-white rounded-lg overflow-hidden shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Title</th>
              <th className="px-4 py-3 text-left font-semibold">Category</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Publish Date</th>
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {news.length > 0 ? news.map(article => (
              <tr key={article._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{article.title}</td>
                <td className="px-4 py-3">{article.category}</td>
                <td className="px-4 py-3">
                  <span className={article.isPublished ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                    {article.isPublished ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3">{article.publishDate ? new Date(article.publishDate).toLocaleDateString() : 'N/A'}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="text-blue-500 hover:text-blue-700"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(article._id, 'news')} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No news found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEventsTab = () => (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Events</h3>
        <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={18} /> Add Event
        </button>
      </div>
      <SearchFilterBar 
        searchTerm={searchTerms.events || ''}
        onSearchChange={(val) => setSearchTerms({...searchTerms, events: val})}
        filters={filters.events || {}}
        onFilterChange={(key, val) => setFilters({...filters, events: {...(filters.events || {}), [key]: val}})}
        filterOptions={{
          eventType: ['Festival', 'Meeting', 'Social', 'Other'],
          status: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled']
        }}
      />
      <div className="bg-white rounded-lg overflow-hidden shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Title</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Venue</th>
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.length > 0 ? events.map(event => (
              <tr key={event._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{event.title}</td>
                <td className="px-4 py-3">{event.eventType}</td>
                <td className="px-4 py-3">{new Date(event.startDate).toLocaleDateString()}</td>
                <td className="px-4 py-3">{event.venue?.name || 'N/A'}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="text-blue-500 hover:text-blue-700"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(event._id, 'events')} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No events found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRelationshipsTab = () => (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Family Relationships</h3>
        <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={18} /> Add Relationship
        </button>
      </div>
      <div className="bg-white rounded-lg overflow-hidden shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">From Member</th>
              <th className="px-4 py-3 text-left font-semibold">Relation</th>
              <th className="px-4 py-3 text-left font-semibold">To Member</th>
              <th className="px-4 py-3 text-left font-semibold">Level</th>
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {relationships.length > 0 ? relationships.map(rel => (
              <tr key={rel._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{rel.fromSerNo}</td>
                <td className="px-4 py-3">{rel.relation}</td>
                <td className="px-4 py-3">{rel.toSerNo}</td>
                <td className="px-4 py-3">{rel.level}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => handleDelete(rel._id, 'relationships')} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No relationships found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderHierarchyFormsTab = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">Family Approval Submissions</h3>
      <div className="bg-white rounded-lg overflow-hidden shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Submitted</th>
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {hierarchyForms.length > 0 ? hierarchyForms.map(form => (
              <tr key={form._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{form.personalDetails?.firstName} {form.personalDetails?.lastName}</td>
                <td className="px-4 py-3">{form.personalDetails?.email}</td>
                <td className="px-4 py-3">
                  <span className={form.isapproved ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold'}>
                    {form.isapproved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-3">{new Date(form.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 flex gap-2">
                  {!form.isapproved && (
                    <button onClick={() => handleApprove(form._id, 'hierarchy-forms')} className="text-green-500 hover:text-green-700">
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(form._id, 'hierarchy-forms')} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No forms found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTempMembersTab = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">Temporary Records Submissions</h3>
      <div className="bg-white rounded-lg overflow-hidden shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Submitted</th>
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tempMembers.length > 0 ? tempMembers.map(member => (
              <tr key={member._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{member.personalDetails?.firstName} {member.personalDetails?.lastName}</td>
                <td className="px-4 py-3">{member.personalDetails?.email}</td>
                <td className="px-4 py-3">
                  <span className={member.status === 'approved' ? 'text-green-600 font-semibold' : member.status === 'pending' ? 'text-yellow-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {member.status}
                  </span>
                </td>
                <td className="px-4 py-3">{new Date(member.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 flex gap-2">
                  {member.status === 'pending' && (
                    <button onClick={() => handleApprove(member._id, 'temp-members')} className="text-green-500 hover:text-green-700">
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(member._id, 'temp-members')} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No temp members found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLoginDetailsTab = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">Credential Records</h3>
      <div className="bg-white rounded-lg overflow-hidden shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Username</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Created</th>
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loginDetails.length > 0 ? loginDetails.map(login => (
              <tr key={login._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{login.username}</td>
                <td className="px-4 py-3">{login.isActive ? 'Active' : 'Inactive'}</td>
                <td className="px-4 py-3">{new Date(login.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="text-blue-500 hover:text-blue-700"><Key size={16} /></button>
                  <button onClick={() => handleDelete(login._id, 'login-details')} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-500">No login details found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const StatCard = ({ title, value, icon, color }) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      orange: 'bg-orange-50 border-orange-200',
      red: 'bg-red-50 border-red-200',
      purple: 'bg-purple-50 border-purple-200',
      yellow: 'bg-yellow-50 border-yellow-200',
      indigo: 'bg-indigo-50 border-indigo-200',
    };

    const iconColorClasses = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      orange: 'text-orange-600',
      red: 'text-red-600',
      purple: 'text-purple-600',
      yellow: 'text-yellow-600',
      indigo: 'text-indigo-600',
    };

    return (
      <div className={`${colorClasses[color]} border rounded-lg p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value || 0}</p>
          </div>
          <div className={`${iconColorClasses[color]} opacity-20`}>{icon}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8" /> Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Manage all system aspects from here</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
            {successMessage}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 border-b bg-white rounded-t-lg">
            <TabButton active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')}>
              <BarChart3 size={16} /> Dashboard
            </TabButton>
            <TabButton active={activeTab === 'users'} onClick={() => handleTabChange('users')}>
              <Users size={16} /> Users
            </TabButton>
            <TabButton active={activeTab === 'members'} onClick={() => handleTabChange('members')}>
              <Users size={16} /> Family Members
            </TabButton>
            <TabButton active={activeTab === 'news'} onClick={() => handleTabChange('news')}>
              <FileText size={16} /> News
            </TabButton>
            <TabButton active={activeTab === 'events'} onClick={() => handleTabChange('events')}>
              <Calendar size={16} /> Events
            </TabButton>
            <TabButton active={activeTab === 'relationships'} onClick={() => handleTabChange('relationships')}>
              <Network size={16} /> Relationships
            </TabButton>
            <TabButton active={activeTab === 'hierarchy-forms'} onClick={() => handleTabChange('hierarchy-forms')}>
              <FileText size={16} /> Family Approval
            </TabButton>
            <TabButton active={activeTab === 'temp-members'} onClick={() => handleTabChange('temp-members')}>
              <AlertCircle size={16} /> Temporary Records
            </TabButton>
            <TabButton active={activeTab === 'login-details'} onClick={() => handleTabChange('login-details')}>
              <Key size={16} /> Credential Records
            </TabButton>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          {!loading && (
            <>
              {activeTab === 'dashboard' && renderDashboardOverview()}
              {activeTab === 'users' && renderUsersTab()}
              {activeTab === 'members' && renderMembersTab()}
              {activeTab === 'news' && renderNewsTab()}
              {activeTab === 'events' && renderEventsTab()}
              {activeTab === 'relationships' && renderRelationshipsTab()}
              {activeTab === 'hierarchy-forms' && renderHierarchyFormsTab()}
              {activeTab === 'temp-members' && renderTempMembersTab()}
              {activeTab === 'login-details' && renderLoginDetailsTab()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
      active
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-600 hover:text-gray-900'
    }`}
  >
    {children}
  </button>
);

export default AdminDashboard;