import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { User, Users, GitBranch, Heart } from 'lucide-react';
import CardFamilyTree from './CardFamilyTree';
import api from './utils/api';

const CardFamilyTreePage = () => {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSerNo, setSelectedSerNo] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberError, setMemberError] = useState(null);
  const [relationsError, setRelationsError] = useState(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [relationsLoading, setRelationsLoading] = useState(false);
  const [relations, setRelations] = useState([]);

  useEffect(() => {
    const fetchHierarchicalTree = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/api/family/hierarchical-tree');
        setTreeData(response.data);
      } catch (err) {
        console.error('Error fetching hierarchical tree:', err);
        setError('Failed to load family tree. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchHierarchicalTree();
  }, []);

  const handleMemberSelect = useCallback(async (serNo) => {
    if (!serNo) return;
    setSelectedSerNo(serNo);
    setMemberError(null);
    setRelationsError(null);
    setMemberLoading(true);
    setRelationsLoading(true);
    setSelectedMember(null);
    setRelations([]);

    try {
      const memberRes = await api.get(`/api/family/members/by-serno/${serNo}`);
      setSelectedMember(memberRes.data?.member || null);
    } catch (err) {
      console.error('Error fetching member details:', err);
      setMemberError('Unable to load member details.');
    } finally {
      setMemberLoading(false);
    }

    try {
      const relationsRes = await api.get(`/api/family/dynamic-relations/${serNo}`);
      setRelations(relationsRes.data || []);
    } catch (err) {
      console.error('Error fetching member relations:', err);
      setRelationsError('Unable to load relations for this member.');
      setRelations([]);
    } finally {
      setRelationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!treeData || selectedSerNo != null) return;
    const rootSerNo = treeData?.attributes?.serNo || treeData?.attributes?.SerNo;
    if (rootSerNo) {
      handleMemberSelect(Number(rootSerNo));
    }
  }, [treeData, selectedSerNo, handleMemberSelect]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-gray-600">Loading family tree...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 font-semibold text-lg mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const renderMemberDetails = () => {
    if (memberLoading) {
      return <p className="text-gray-500">Loading member details...</p>;
    }

    if (memberError) {
      return <p className="text-red-600">{memberError}</p>;
    }

    if (!selectedMember) {
      return <p className="text-gray-500">Select a family member to view their details.</p>;
    }

    const personal = selectedMember.personalDetails || {};
    const displayName = personal.fullName || `${personal.firstName || ''} ${personal.middleName || ''} ${personal.lastName || ''}`.trim();

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{displayName || 'Unknown Member'}</h2>
          <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600">
            {selectedMember.serNo && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full">ID: {selectedMember.serNo}</span>
            )}
            {selectedMember.level != null && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Level {selectedMember.level}</span>
            )}
            {personal.gender && (
              <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full">{personal.gender}</span>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-700">
          {selectedMember.vansh && (
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-500" />
              <span className="font-medium">Vansh:</span>
              <span>{selectedMember.vansh}</span>
            </div>
          )}
          {personal.city && (
            <div className="flex items-center gap-2">
              <User size={16} className="text-green-500" />
              <span className="font-medium">Location:</span>
              <span>{[personal.city, personal.state, personal.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {personal.profession && (
            <div className="flex items-center gap-2">
              <Heart size={16} className="text-red-500" />
              <span className="font-medium">Profession:</span>
              <span>{personal.profession}</span>
            </div>
          )}
          {personal.address && (
            <div className="flex items-start gap-2">
              <GitBranch size={16} className="text-purple-500 mt-1" />
              <div>
                <span className="font-medium">Address:</span>
                <p>{personal.address}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/family/member/${selectedMember.serNo}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            View full profile
          </Link>
        </div>
      </div>
    );
  };

  const renderRelations = () => {
    if (relationsLoading) {
      return <p className="text-gray-500">Checking relations...</p>;
    }

    if (relationsError) {
      return <p className="text-red-600">{relationsError}</p>;
    }

    if (!relations || relations.length === 0) {
      return <p className="text-gray-500">No relations found for this member.</p>;
    }

    return (
      <div className="space-y-2">
        {relations.map((relation, index) => {
          const relatedSerNo = relation.related?.serNo;
          const relatedName = [relation.related?.firstName, relation.related?.middleName, relation.related?.lastName]
            .filter(Boolean)
            .join(' ') || relation.related?.fullName || `Member #${relatedSerNo}`;
          const relationLabel = relation.relationMarathi
            ? `${relation.relationEnglish} (${relation.relationMarathi})`
            : relation.relationEnglish;

          return (
            <button
              key={`${relation.relationEnglish}-${relatedSerNo}-${index}`}
              type="button"
              onClick={() => relatedSerNo && handleMemberSelect(relatedSerNo)}
              className="w-full text-left border border-orange-100 rounded-lg px-3 py-2 hover:border-orange-300 hover:bg-orange-50 transition"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">{relatedName}</span>
                <span className="text-sm text-orange-600">{relationLabel}</span>
              </div>
              {relatedSerNo && (
                <p className="text-xs text-gray-500 mt-1">ID: {relatedSerNo}</p>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Gogte Family Tree
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore the Gogte family heritage through generations. Click on any family member to explore their profile and discover their relationships.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
              {treeData && treeData.name && treeData.name !== 'No Family Data' ? (
                <CardFamilyTree 
                  data={treeData} 
                  selectedSerNo={selectedSerNo}
                  onMemberSelect={handleMemberSelect}
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No family data available at the moment.</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Member Details</h2>
                {renderMemberDetails()}
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Family Relations</h2>
                {renderRelations()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardFamilyTreePage;