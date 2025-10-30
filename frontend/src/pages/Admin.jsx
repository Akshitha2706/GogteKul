import React, { useState } from 'react';
import { Check, X, User, Calendar, Mail, Phone, MapPin, FileText, Shield, Bell, Search, Filter, Download, Clock, Users, AlertCircle, Star, Eye, MessageSquare, Archive, UserCheck, UserX } from 'lucide-react';

const GogteKulAdmin = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Mock data for pending registrations
  const pendingRegistrations = [
    {
      id: 1,
      name: 'Rahul Gogte',
      email: 'rahul.gogte@email.com',
      phone: '+91 98765 43210',
      birthDate: '1990-05-15',
      address: 'Pune, Maharashtra',
      relation: 'Grandson',
      parentName: 'Sunil Gogte',
      submissionDate: '2025-09-05',
      documents: ['Aadhaar Card', 'Birth Certificate', 'Family Photo'],
      status: 'pending',
      priority: 'high',
      verificationScore: 85,
      familyTreePosition: 'Generation 3',
      additionalNotes: 'Strong family resemblance, all documents verified'
    },
    {
      id: 2,
      name: 'Priya Gogte Sharma',
      email: 'priya.sharma@email.com',
      phone: '+91 87654 32109',
      birthDate: '1985-12-20',
      address: 'Mumbai, Maharashtra',
      relation: 'Daughter-in-law',
      parentName: 'Amit Gogte',
      submissionDate: '2025-09-04',
      documents: ['Marriage Certificate', 'Aadhaar Card', 'Wedding Photos'],
      status: 'pending',
      priority: 'medium',
      verificationScore: 92,
      familyTreePosition: 'Generation 2',
      additionalNotes: 'Marriage certificate verified with family records'
    },
    {
      id: 3,
      name: 'Aditya Gogte',
      email: 'aditya.gogte@email.com',
      phone: '+91 76543 21098',
      birthDate: '1995-08-10',
      address: 'Nagpur, Maharashtra',
      relation: 'Son',
      parentName: 'Rajesh Gogte',
      submissionDate: '2025-09-03',
      documents: ['Aadhaar Card', 'Educational Certificate', 'Birth Certificate'],
      status: 'under_review',
      priority: 'low',
      verificationScore: 78,
      familyTreePosition: 'Generation 3',
      additionalNotes: 'Additional verification required for family lineage'
    },
    {
      id: 4,
      name: 'Meera Gogte Patel',
      email: 'meera.patel@email.com',
      phone: '+91 65432 10987',
      birthDate: '1988-03-25',
      address: 'Ahmedabad, Gujarat',
      relation: 'Niece',
      parentName: 'Deepak Gogte',
      submissionDate: '2025-09-02',
      documents: ['Aadhaar Card', 'Marriage Certificate'],
      status: 'pending',
      priority: 'medium',
      verificationScore: 88,
      familyTreePosition: 'Generation 3',
      additionalNotes: 'Recently relocated, documents authentic'
    }
  ];

  const approvedMembers = [
    {
      id: 5,
      name: 'Sneha Gogte',
      email: 'sneha.gogte@email.com',
      relation: 'Daughter',
      approvedDate: '2025-09-01',
      status: 'approved',
      approvedBy: 'Admin',
      membershipType: 'Full Member'
    },
    {
      id: 6,
      name: 'Vikram Gogte',
      email: 'vikram.gogte@email.com',
      relation: 'Son',
      approvedDate: '2025-08-28',
      status: 'approved',
      approvedBy: 'Admin',
      membershipType: 'Full Member'
    },
    {
      id: 7,
      name: 'Kavita Gogte Shah',
      email: 'kavita.shah@email.com',
      relation: 'Daughter-in-law',
      approvedDate: '2025-08-25',
      status: 'approved',
      approvedBy: 'Admin',
      membershipType: 'Associate Member'
    }
  ];

  const rejectedRequests = [
    {
      id: 8,
      name: 'Unknown Applicant',
      email: 'fake.email@example.com',
      reason: 'Insufficient documentation and unable to verify family connection',
      rejectedDate: '2025-08-20',
      rejectedBy: 'Admin'
    }
  ];

  const handleApprove = (id, applicantData) => {
    setApprovalAction({ type: 'approve', id, data: applicantData });
    setShowApprovalModal(true);
  };

  const handleReject = (id, applicantData) => {
    setApprovalAction({ type: 'reject', id, data: applicantData });
    setShowApprovalModal(true);
  };

  const confirmAction = () => {
    if (approvalAction?.type === 'approve') {
      console.log('Approved:', approvalAction.id);
    } else if (approvalAction?.type === 'reject') {
      console.log('Rejected:', approvalAction.id);
    }
    setShowApprovalModal(false);
    setApprovalAction(null);
  };

  const toggleMemberSelection = (id) => {
    setSelectedMembers(prev => 
      prev.includes(id) 
        ? prev.filter(memberId => memberId !== id)
        : [...prev, id]
    );
  };

  const handleBulkAction = (action) => {
    console.log(`Bulk ${action}:`, selectedMembers);
    setSelectedMembers([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-400 to-purple-600">
      <div className="absolute inset-0 bg-black/10"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-yellow-300/20 rounded-full blur-xl"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-orange-300/20 rounded-full blur-xl"></div>
      
      {/* Header */}
      <div className="relative bg-white/95 backdrop-blur-md shadow-xl border-b border-orange-200/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">GogteKul Heritage</h1>
                <p className="text-gray-600">Family Registration Management System</p>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <span>Admin Panel</span>
                  <span>•</span>
                  <span>Last Updated: Sep 7, 2025</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome back,</p>
                <p className="font-semibold text-gray-800">Heritage Administrator</p>
              </div>
              <div className="relative">
                <Bell className="w-7 h-7 text-orange-600 cursor-pointer hover:text-orange-700 transition-colors" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-xs font-bold">4</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-orange-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending Requests</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">4</p>
                <p className="text-xs text-orange-500 mt-1">+2 this week</p>
              </div>
              <Clock className="w-12 h-12 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-green-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Approved Members</p>
                <p className="text-3xl font-bold text-green-600 mt-1">3</p>
                <p className="text-xs text-green-500 mt-1">+1 this week</p>
              </div>
              <UserCheck className="w-12 h-12 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-red-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Under Review</p>
                <p className="text-3xl font-bold text-red-600 mt-1">1</p>
                <p className="text-xs text-red-500 mt-1">Action needed</p>
              </div>
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-blue-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Family</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">156</p>
                <p className="text-xs text-blue-500 mt-1">Active members</p>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Rejected</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">1</p>
                <p className="text-xs text-purple-500 mt-1">This month</p>
              </div>
              <UserX className="w-12 h-12 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Main Management Panel */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-orange-200/50">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-0 px-6">
              {[
                { id: 'pending', label: 'Pending Requests', count: 4 },
                { id: 'approved', label: 'Approved Members', count: 3 },
                { id: 'rejected', label: 'Rejected', count: 1 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-6 border-b-4 font-semibold text-sm transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tab.label}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      activeTab === tab.id ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Search and Controls */}
          <div className="p-6 border-b border-gray-200 bg-gray-50/50">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, phone, or relation..."
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white min-w-[150px]"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Priority</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
              
              <div className="flex gap-3">
                {selectedMembers.length > 0 && (
                  <>
                    <button
                      onClick={() => handleBulkAction('approve')}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg"
                    >
                      <Check className="w-4 h-4" />
                      Bulk Approve ({selectedMembers.length})
                    </button>
                    <button
                      onClick={() => handleBulkAction('reject')}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg"
                    >
                      <X className="w-4 h-4" />
                      Bulk Reject ({selectedMembers.length})
                    </button>
                  </>
                )}
                <button className="px-4 py-3 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-all shadow-lg">
                  <Download className="w-5 h-5" />
                </button>
                <button className="px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all shadow-lg">
                  <Filter className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {activeTab === 'pending' && (
              <div className="space-y-6">
                {pendingRegistrations.map((request) => (
                  <div
                    key={request.id}
                    className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 border-l-4 border-orange-500 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(request.id)}
                          onChange={() => toggleMemberSelection(request.id)}
                          className="mt-2 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-xl font-bold text-gray-800">{request.name}</h3>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              request.priority === 'high' ? 'bg-red-100 text-red-700' :
                              request.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {request.priority} priority
                            </span>
                            {request.status === 'under_review' && (
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                Under Review
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-semibold text-gray-600">{request.verificationScore}%</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-700 mb-4">
                            <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
                              <Mail className="w-4 h-4 text-orange-500" />
                              <span className="font-medium">{request.email}</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
                              <Phone className="w-4 h-4 text-orange-500" />
                              <span className="font-medium">{request.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
                              <MapPin className="w-4 h-4 text-orange-500" />
                              <span className="font-medium">{request.address}</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
                              <User className="w-4 h-4 text-orange-500" />
                              <span className="font-medium">{request.relation}</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
                              <Calendar className="w-4 h-4 text-orange-500" />
                              <span className="font-medium">Born: {request.birthDate}</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
                              <FileText className="w-4 h-4 text-orange-500" />
                              <span className="font-medium">{request.documents.length} documents</span>
                            </div>
                          </div>

                          <div className="bg-white/70 rounded-lg p-3 mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-semibold text-gray-600">Parent:</span>
                                <span className="ml-2 text-gray-800">{request.parentName}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-600">Family Tree:</span>
                                <span className="ml-2 text-gray-800">{request.familyTreePosition}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="font-semibold text-gray-600">Submitted:</span>
                                <span className="ml-2 text-gray-800">{request.submissionDate}</span>
                              </div>
                            </div>
                          </div>

                          {request.additionalNotes && (
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                              <p className="text-sm text-blue-800">
                                <strong>Notes:</strong> {request.additionalNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 ml-6">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                        <button
                          onClick={() => handleApprove(request.id, request)}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all font-medium flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.id, request)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all font-medium flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'approved' && (
              <div className="space-y-4">
                {approvedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-l-4 border-green-500 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-gray-800">{member.name}</h3>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                            {member.membershipType}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                          <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
                            <Mail className="w-4 h-4 text-green-500" />
                            <span className="font-medium">{member.email}</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
                            <User className="w-4 h-4 text-green-500" />
                            <span className="font-medium">{member.relation}</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
                            <Calendar className="w-4 h-4 text-green-500" />
                            <span className="font-medium">Approved: {member.approvedDate}</span>
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-gray-600">
                          Approved by: <span className="font-semibold">{member.approvedBy}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Active Member
                        </span>
                        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                          <MessageSquare className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'rejected' && (
              <div className="space-y-4">
                {rejectedRequests.length > 0 ? (
                  rejectedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-6 border-l-4 border-red-500"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2">{request.name}</h3>
                          <div className="text-sm text-gray-700 mb-3">
                            <strong>Email:</strong> {request.email}
                          </div>
                          <div className="bg-red-100 border-l-4 border-red-400 p-3 rounded-r-lg">
                            <p className="text-sm text-red-800">
                              <strong>Rejection Reason:</strong> {request.reason}
                            </p>
                          </div>
                          <div className="mt-3 text-sm text-gray-600">
                            Rejected by: <span className="font-semibold">{request.rejectedBy}</span> • 
                            Date: {request.rejectedDate}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold flex items-center gap-2">
                            <X className="w-4 h-4" />
                            Rejected
                          </span>
                          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <Archive className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <UserX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No rejected registrations at this time.</p>
                    <p className="text-gray-400 text-sm mt-2">All family registration requests have been processed successfully.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Registration Details</h2>
                  <p className="text-gray-600">Complete family member verification</p>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Full Name</label>
                    <p className="text-lg text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedRequest.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Email Address</label>
                    <p className="text-lg text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Phone Number</label>
                    <p className="text-lg text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedRequest.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Birth Date</label>
                    <p className="text-lg text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedRequest.birthDate}</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Family Relation</label>
                    <p className="text-lg text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedRequest.relation}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Parent Name</label>
                    <p className="text-lg text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedRequest.parentName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Family Tree Position</label>
                    <p className="text-lg text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedRequest.familyTreePosition}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Verification Score</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full"
                          style={{ width: `${selectedRequest.verificationScore}%` }}
                        ></div>
                      </div>
                      <span className="text-lg font-bold text-gray-800">{selectedRequest.verificationScore}%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Address</label>
                <p className="text-lg text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedRequest.address}</p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Submitted Documents</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedRequest.documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
                      <FileText className="w-5 h-5 text-orange-500" />
                      <span className="flex-1 font-medium">{doc}</span>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-semibold">View</button>
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedRequest.additionalNotes && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Additional Notes</label>
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl">
                    <p className="text-gray-800">{selectedRequest.additionalNotes}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-gray-200 bg-gray-50/50 flex gap-4 justify-end rounded-b-3xl">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleReject(selectedRequest.id, selectedRequest);
                  setSelectedRequest(null);
                }}
                className="px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center gap-2 font-semibold transition-all"
              >
                <X className="w-5 h-5" />
                Reject Application
              </button>
              <button
                onClick={() => {
                  handleApprove(selectedRequest.id, selectedRequest);
                  setSelectedRequest(null);
                }}
                className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2 font-semibold transition-all"
              >
                <Check className="w-5 h-5" />
                Approve Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval/Rejection Modal */}
      {showApprovalModal && approvalAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  approvalAction.type === 'approve' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {approvalAction.type === 'approve' ? (
                    <Check className="w-8 h-8 text-green-600" />
                  ) : (
                    <X className="w-8 h-8 text-red-600" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {approvalAction.type === 'approve' ? 'Approve Registration' : 'Reject Registration'}
                </h3>
                <p className="text-gray-600">
                  Are you sure you want to {approvalAction.type} the registration for{' '}
                  <span className="font-semibold">{approvalAction.data?.name}</span>?
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className={`flex-1 px-4 py-3 text-white rounded-xl font-semibold transition-all ${
                    approvalAction.type === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {approvalAction.type === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GogteKulAdmin;