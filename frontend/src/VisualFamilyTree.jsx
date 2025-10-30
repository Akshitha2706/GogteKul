import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  Users, 
  User, 
  Heart, 
  Eye, 
  Info,
  Calendar,
  MapPin,
  GitBranch,
  Home,
  Search,
  Filter,
  BarChart3
} from 'lucide-react';
import api from './utils/api';

const VisualFamilyTree = () => {
  const [allMembers, setAllMembers] = useState([]);
  const [allRelationships, setAllRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [dynamicRelations, setDynamicRelations] = useState([]);
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllRelationships, setShowAllRelationships] = useState(true);
  const [highlightedMembers, setHighlightedMembers] = useState(new Set());
  const { serNo } = useParams();

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        const [membersRes, relationshipsRes] = await Promise.all([
          api.get('/api/family/members-new'),
          api.get('/api/family/all-relationships')
        ]);
        
        setAllMembers(membersRes.data);
        setAllRelationships(relationshipsRes.data);
        
        if (serNo) {
          const member = membersRes.data.find(m => m.serNo === parseInt(serNo));
          setSelectedMember(member);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching visual family data:', err);
        setError('Failed to load family data');
        setLoading(false);
      }
    };

    fetchAllData();
  }, [serNo]);

  // Group members by database level (ensuring spouses are in same level)
  const getFilteredAndGroupedMembers = () => {
    // First, filter members to include only those in paternal lineage
    const filteredMembers = allMembers.filter(member => {
      const isRootMember = member.serNo <= 2; // Root ancestors
      const isInPaternalLineage = member.fatherSerNo && allMembers.some(m => m.serNo === member.fatherSerNo);
      const isSpouseOfPaternalMember = allMembers.some(m => m.spouseSerNo === member.serNo && (
        m.fatherSerNo || m.serNo <= 2 // Spouse of someone in paternal lineage or root
      ));
      
      return isRootMember || isInPaternalLineage || isSpouseOfPaternalMember;
    });

    // Group by database level, ensuring spouses and siblings are together
    const membersByLevel = {};
    const processedMembers = new Set();

    filteredMembers.forEach(member => {
      if (processedMembers.has(member.serNo)) return;

      // Use the member's database level as starting point
      let level = member.level !== undefined && member.level !== null ? member.level : "Unknown";
      
      // Collect all family members that should be at the same level
      const familyGroup = [member];
      
      // If member has a spouse, add spouse to the group
      if (member.spouseSerNo) {
        const spouse = filteredMembers.find(m => m.serNo === member.spouseSerNo);
        if (spouse && !processedMembers.has(spouse.serNo)) {
          familyGroup.push(spouse);
          
          // Determine which level to use based on who is in paternal lineage
          const memberIsPaternal = member.fatherSerNo && allMembers.some(m => m.serNo === member.fatherSerNo) || member.serNo <= 2;
          const spouseIsPaternal = spouse.fatherSerNo && allMembers.some(m => m.serNo === spouse.fatherSerNo) || spouse.serNo <= 2;
          
          if (memberIsPaternal && !spouseIsPaternal) {
            // Use member's level (paternal lineage priority)
            level = member.level !== undefined && member.level !== null ? member.level : "Unknown";
          } else if (!memberIsPaternal && spouseIsPaternal) {
            // Use spouse's level (paternal lineage priority)
            level = spouse.level !== undefined && spouse.level !== null ? spouse.level : "Unknown";
          } else {
            // Both or neither are paternal, use the level that's defined
            level = member.level !== undefined && member.level !== null ? member.level : 
                   (spouse.level !== undefined && spouse.level !== null ? spouse.level : "Unknown");
          }
        }
      }
      
      // Find siblings (same father) and add them to the group if they have the same level
      if (member.fatherSerNo) {
        const siblings = filteredMembers.filter(m => 
          !processedMembers.has(m.serNo) && 
          m.fatherSerNo === member.fatherSerNo && 
          m.serNo !== member.serNo &&
          m.level === level
        );
        
        siblings.forEach(sibling => {
          if (!familyGroup.some(fm => fm.serNo === sibling.serNo)) {
            familyGroup.push(sibling);
            
            // If sibling has a spouse, add spouse too
            if (sibling.spouseSerNo) {
              const siblingSpouse = filteredMembers.find(m => 
                m.serNo === sibling.spouseSerNo && !processedMembers.has(m.serNo)
              );
              if (siblingSpouse && !familyGroup.some(fm => fm.serNo === siblingSpouse.serNo)) {
                familyGroup.push(siblingSpouse);
              }
            }
          }
        });
      }
      
      // Add all family group members to the same level
      if (!membersByLevel[level]) membersByLevel[level] = [];
      familyGroup.forEach(fm => {
        membersByLevel[level].push(fm);
        processedMembers.add(fm.serNo);
      });
    });

    return membersByLevel;
  };

  const membersByLevel = getFilteredAndGroupedMembers();

  // Get relationship between two members
  const getRelationship = (fromSerNo, toSerNo) => {
    return allRelationships.find(rel => 
      (rel.fromSerNo === fromSerNo && rel.toSerNo === toSerNo) ||
      (rel.fromSerNo === toSerNo && rel.toSerNo === fromSerNo)
    );
  };

  // Get all relationships for a member
  const getMemberRelationships = (memberSerNo) => {
    return allRelationships.filter(rel => 
      rel.fromSerNo === memberSerNo || rel.toSerNo === memberSerNo
    );
  };

  // Fetch dynamic relations for a member
  const fetchDynamicRelations = async (memberSerNo) => {
    try {
      setLoadingRelations(true);
      const response = await api.get(`/api/family/dynamic-relations/${memberSerNo}`);
      setDynamicRelations(response.data || []);
      
      // Highlight related members
      const relatedSerNos = new Set(response.data.map(rel => rel.related?.serNo).filter(Boolean));
      relatedSerNos.add(memberSerNo); // Include the selected member
      setHighlightedMembers(relatedSerNos);
      
    } catch (err) {
      console.error('Error fetching dynamic relations:', err);
      setDynamicRelations([]);
      setHighlightedMembers(new Set());
    } finally {
      setLoadingRelations(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Filter members based on search
  const filteredMembers = allMembers.filter(member => {
    if (!searchTerm) return true;
    return member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           member.serNo.toString().includes(searchTerm) ||
           member.vansh?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const MemberNode = ({ member, level }) => {
    const memberName = member.fullName || `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim();
    const isSelected = selectedMember?.serNo === member.serNo;
    const isHighlighted = highlightedMembers.has(member.serNo);
    const memberRelationships = getMemberRelationships(member.serNo);
    
    // Find connections to other levels
    const parentConnections = allRelationships.filter(rel => 
      rel.toSerNo === member.serNo && 
      allMembers.find(m => m.serNo === rel.fromSerNo && m.level < member.level)
    );
    
    const childConnections = allRelationships.filter(rel => 
      rel.fromSerNo === member.serNo && 
      allMembers.find(m => m.serNo === rel.toSerNo && m.level > member.level)
    );

    return (
      <div className="relative flex flex-col items-center">
        {/* Parent Connection Lines */}
        {parentConnections.length > 0 && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <div className="w-px h-6 bg-gray-300"></div>
            {parentConnections.map((rel, idx) => (
              <div key={idx} className="absolute -top-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium border border-purple-200 shadow-sm">
                  {rel.relation}
                  {rel.relationMarathi && (
                    <span className="ml-1 text-purple-600">({rel.relationMarathi})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Member Card */}
        <div 
          className={`bg-white rounded-lg shadow-md border-2 p-3 transition-all duration-200 cursor-pointer min-w-[200px] ${
            isSelected 
              ? 'border-blue-500 shadow-lg scale-105' 
              : isHighlighted
              ? 'border-green-400 shadow-lg bg-green-50'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
          }`}
          onClick={() => {
            setSelectedMember(member);
            fetchDynamicRelations(member.serNo);
          }}
        >
          {/* Profile Image */}
          {member.profileImage && (
            <div className="flex justify-center mb-3">
              <img 
                src={member.profileImage} 
                alt={memberName}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Member Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              {!member.profileImage && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                  member.gender === 'Male' ? 'bg-blue-100' : 'bg-pink-100'
                }`}>
                  <User className={`h-4 w-4 ${member.gender === 'Male' ? 'text-blue-500' : 'text-pink-500'}`} />
                </div>
              )}
              <div>
                <h4 className="font-bold text-sm">{memberName}</h4>
                <div className="flex items-center space-x-1 text-xs text-gray-600">
                  <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full">
                    #{member.serNo}
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                    L{member.level}
                  </span>
                </div>
              </div>
            </div>
            
            <Link 
              to={`/family/member/${member.serNo}`}
              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
              title="View Details"
            >
              <Eye size={12} />
            </Link>
          </div>

          {/* Member Details */}
          <div className="space-y-1 text-xs">
            {member.vansh && (
              <div className="flex items-center text-gray-600">
                <MapPin size={10} className="mr-1" />
                <span>{member.vansh}</span>
              </div>
            )}
            
            {member.dob && (
              <div className="flex items-center text-gray-600">
                <Calendar size={10} className="mr-1" />
                <span>Born: {formatDate(member.dob)}</span>
              </div>
            )}
            
            {member.sonDaughterCount > 0 && (
              <div className="flex items-center text-gray-600">
                <Users size={10} className="mr-1" />
                <span>Children: {member.sonDaughterCount}</span>
              </div>
            )}
          </div>

          {/* Relationship Count */}
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              {memberRelationships.length} relationships
            </div>
            {isHighlighted && selectedMember && selectedMember.serNo !== member.serNo && (
              <div className="mt-1">
                {dynamicRelations
                  .filter(rel => rel.related?.serNo === member.serNo)
                  .map((rel, idx) => (
                    <div key={idx} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium mr-1 mb-1">
                      {rel.relationEnglish}
                      {rel.relationMarathi && (
                        <span className="ml-1 text-green-600">({rel.relationMarathi})</span>
                      )}
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>

        {/* Child Connection Lines */}
        {childConnections.length > 0 && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
            <div className="w-px h-6 bg-gray-300"></div>
            {childConnections.slice(0, 3).map((rel, idx) => (
              <div key={idx} className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium border border-green-200 shadow-sm">
                  {rel.relation}
                  {rel.relationMarathi && (
                    <span className="ml-1 text-green-600">({rel.relationMarathi})</span>
                  )}
                </div>
              </div>
            ))}
            {childConnections.length > 3 && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                  +{childConnections.length - 3} more
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading visual family tree...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="text-center py-16 bg-white rounded-lg shadow-md">
          <div className="text-red-400 mb-4">
            <Users size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Visual Tree</h3>
          <p className="text-gray-500 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  const levels = Object.keys(membersByLevel).sort((a, b) => parseInt(a) - parseInt(b));
  const filteredLevels = levels.filter(level => 
    membersByLevel[level].some(member => filteredMembers.includes(member))
  );

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Visual Family Tree</h1>
            <p className="text-gray-600 mt-1">
              Family tree with relationship connections - {allMembers.length} members, {allRelationships.length} relationships
            </p>
            {selectedMember && (
              <div className="mt-2 inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                <Heart size={14} className="mr-1" />
                Showing relationships for: {selectedMember.fullName}
              </div>
            )}
          </div>
          <div className="flex space-x-3 mt-4 lg:mt-0">
            <Link 
              to="/relationships"
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg flex items-center transition-colors"
            >
              <Heart className="mr-2" size={16} />
              All Relationships
            </Link>
            <Link 
              to="/family"
              className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center transition-colors"
            >
              <Home className="mr-2" size={16} />
              Family List
            </Link>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search family members..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showAllRelationships}
                  onChange={(e) => setShowAllRelationships(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Show Relationship Labels</span>
              </label>
              
              {highlightedMembers.size > 0 && (
                <button
                  onClick={() => {
                    setSelectedMember(null);
                    setDynamicRelations([]);
                    setHighlightedMembers(new Set());
                  }}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                >
                  Clear Highlights ({highlightedMembers.size})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Family Tree */}
      <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
        <div className="min-w-max">
          {filteredLevels.map((level, levelIndex) => {
            const levelMembers = membersByLevel[level].filter(member => 
              filteredMembers.includes(member)
            );

            return (
              <div key={level} className="mb-16 relative">
                {/* Level Header */}
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-gray-800 bg-gray-100 inline-block px-4 py-2 rounded-full">
                    Generation {level} ({levelMembers.length} members)
                  </h3>
                </div>

                {/* Level Members */}
                <div className="flex flex-wrap justify-center gap-8">
                  {levelMembers.map(member => (
                    <MemberNode 
                      key={member.serNo} 
                      member={member} 
                      level={parseInt(level)}
                    />
                  ))}
                </div>

                {/* Connection Line to Next Level */}
                {levelIndex < filteredLevels.length - 1 && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-px h-8 bg-gray-300"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    {selectedMember.fullName} - Dynamic Relationships
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    #{selectedMember.serNo} • Level {selectedMember.level} • {selectedMember.gender}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedMember(null);
                    setDynamicRelations([]);
                    setHighlightedMembers(new Set());
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {loadingRelations && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-gray-600">Loading relationships...</span>
                </div>
              )}
              
              {!loadingRelations && (
                <>
                  {/* Member Basic Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {selectedMember.vansh && (
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-2 text-blue-600" />
                          <span><strong>Vansh:</strong> {selectedMember.vansh}</span>
                        </div>
                      )}
                      {selectedMember.dob && (
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-2 text-blue-600" />
                          <span><strong>DOB:</strong> {formatDate(selectedMember.dob)}</span>
                        </div>
                      )}
                      {selectedMember.sonDaughterCount > 0 && (
                        <div className="flex items-center">
                          <Users size={14} className="mr-2 text-blue-600" />
                          <span><strong>Children:</strong> {selectedMember.sonDaughterCount}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dynamic relationships */}
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">
                      All Relationships ({dynamicRelations.length})
                    </h4>
                    
                    {dynamicRelations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Heart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No relationships found</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {dynamicRelations.map((relation, idx) => {
                          const relatedMember = relation.related;
                          const name = [
                            relatedMember?.firstName,
                            relatedMember?.middleName,
                            relatedMember?.lastName
                          ].filter(Boolean).join(' ') || relatedMember?.fullName || 'Unknown';
                          
                          return (
                            <div key={idx} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                                      {relation.relationEnglish}
                                    </span>
                                    {relation.relationMarathi && (
                                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                                        {relation.relationMarathi}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-gray-800 font-medium">{name}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    SerNo: #{relatedMember?.serNo} • Level {relatedMember?.level}
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => {
                                      setSelectedMember(relatedMember);
                                      fetchDynamicRelations(relatedMember?.serNo);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                                    title="View Relations"
                                  >
                                    Relations
                                  </button>
                                  <Link 
                                    to={`/family/member/${relatedMember?.serNo}`}
                                    className="text-green-600 hover:text-green-800 text-xs bg-green-50 hover:bg-green-100 px-2 py-1 rounded flex items-center"
                                    title="View Details"
                                  >
                                    <Eye size={12} className="mr-1" />
                                    Details
                                  </Link>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Legend & Instructions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Visual Legend */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">Visual Elements</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded mr-2"></div>
                <span>Parent relationships</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2"></div>
                <span>Child relationships</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-100 rounded mr-2"></div>
                <span>Male members</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-pink-100 rounded mr-2"></div>
                <span>Female members</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 border-2 border-blue-500 rounded mr-2"></div>
                <span>Selected member</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-50 border-2 border-green-400 rounded mr-2"></div>
                <span>Related members</span>
              </div>
            </div>
          </div>
          
          {/* Instructions */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">How to Use</h4>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></div>
                <span><strong>Click on any member</strong> to see all their relationships</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></div>
                <span><strong>Green highlighted cards</strong> show related members</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></div>
                <span><strong>Relationship tags</strong> appear on related members</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></div>
                <span><strong>Modal window</strong> shows detailed relationship information</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualFamilyTree;