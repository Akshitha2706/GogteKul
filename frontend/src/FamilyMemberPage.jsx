import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, UserCircle, GitBranch } from 'lucide-react';
import api from './utils/api';

const FamilyMemberPage = () => {
  const [member, setMember] = useState(null);
  const [parents, setParents] = useState({ father: null, mother: null });
  const [children, setChildren] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRelations, setLoadingRelations] = useState(true);
  const [error, setError] = useState(null);
  const { serNo } = useParams();

  // Debug: Log the current location and params
  console.log('FamilyMemberPage - Current location:', window.location.pathname);
  console.log('FamilyMemberPage - useParams result:', useParams());
  console.log('FamilyMemberPage - serNo from params:', serNo);

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        setLoading(true);
        
        // Debug: Log the serNo parameter
        console.log('FamilyMemberPage serNo:', serNo);
        
        if (!serNo || serNo === 'undefined' || isNaN(parseInt(serNo))) {
          throw new Error(`Invalid serNo parameter: ${serNo}`);
        }
        
        // Fetch member details using new API
        console.log(`Fetching member: /api/family/member-new/${serNo}`);
        const memberRes = await api.get(`/api/family/member-new/${serNo}`);
        setMember(memberRes.data);
        
        // Fetch parents using new API
        console.log(`Fetching parents: /api/family/member-new/${serNo}/parents`);
        const parentsRes = await api.get(`/api/family/member-new/${serNo}/parents`);
        setParents(parentsRes.data);
        
        // Fetch children using new API
        console.log(`Fetching children: /api/family/member-new/${serNo}/children`);
        const childrenRes = await api.get(`/api/family/member-new/${serNo}/children`);
        setChildren(childrenRes.data);
        
        // Fetch relations using relationRules mapping (dynamic computation)
        try {
          setLoadingRelations(true);
          console.log(`Fetching relations: /api/family/dynamic-relations/${serNo}`);
          const relationsRes = await api.get(`/api/family/dynamic-relations/${serNo}`);
          console.log('Relations response:', relationsRes.data);
          setRelations(relationsRes.data || []);
        } catch (e) {
          console.error('Failed to fetch dynamic relations (relationRules based):', e?.response?.data || e.message);
          setRelations([]);
        } finally {
          setLoadingRelations(false);
        }

        // Set a minimum loading time for better UX
        setTimeout(() => {
          setLoading(false);
        }, 300);
      } catch (err) {
        console.error('Error fetching family member data:', err);
        setTimeout(() => {
          setError('Failed to load family member data. Please try again later.');
          setLoading(false);
          setLoadingRelations(false);
        }, 300);
      }
    };

    fetchMemberData();
  }, [serNo]);

  if (loading) return <div className="text-center py-10">Loading member details...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (!member) return <div className="text-center py-10">Member not found.</div>;

  const memberName = member.fullName || `${member.firstName || ''} ${member.lastName || ''}`.trim();

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4">
        <Link to="/family" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Family List
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{memberName || 'Family Member Details'}</h1>
          <p className="text-sm text-gray-500">Serial Number: #{member.serNo}</p>
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="text-lg font-semibold text-gray-800">{memberName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gender</p>
                <p className="text-gray-800">{member.gender || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vansh</p>
                <p className="text-gray-800">{member.vansh || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Level</p>
                <p className="text-gray-800">{member.level ?? 'N/A'}</p>
              </div>
            </div>
          </div>
          
        </div>
        
        <div>
          {/* Parents section */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <UserCircle className="h-5 w-5 mr-2 text-blue-500" />
              Parents ({(parents.father ? 1 : 0) + (parents.mother ? 1 : 0)})
            </h3>
            
            {parents.father || parents.mother ? (
              <div>
                {parents.father && (
                  <Link to={`/family/member/${parents.father.serNo}`} className="block p-2 hover:bg-gray-50 rounded mb-2">
                    <p className="font-medium">
                      {parents.father.fullName || `${parents.father.firstName || ''} ${parents.father.lastName || ''}`.trim()}
                    </p>
                    <p className="text-xs text-gray-500">Father • #{parents.father.serNo}</p>
                  </Link>
                )}
                
                {parents.mother && (
                  <Link to={`/family/member/${parents.mother.serNo}`} className="block p-2 hover:bg-gray-50 rounded">
                    <p className="font-medium">
                      {parents.mother.fullName || `${parents.mother.firstName || ''} ${parents.mother.lastName || ''}`.trim()}
                    </p>
                    <p className="text-xs text-gray-500">Mother • #{parents.mother.serNo}</p>
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No parent information available</p>
            )}
          </div>
          
          {/* Children section */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-500" />
              Children ({children.length})
            </h3>
            
            {children.length > 0 ? (
              <div className="max-h-60 overflow-y-auto">
                {children.map(child => (
                  <Link 
                    key={child.serNo} 
                    to={`/family/member/${child.serNo}`} 
                    className="block p-2 hover:bg-gray-50 rounded mb-1"
                  >
                    <p className="font-medium">
                      {child.fullName || `${child.firstName || ''} ${child.lastName || ''}`.trim()}
                    </p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{child.gender}</span>
                      <span>#{child.serNo}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No children</p>
            )}
          </div>

          {/* Dynamic Relations */}
          <div className="bg-white rounded-lg shadow-md p-4 mt-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <GitBranch className="h-5 w-5 mr-2 text-green-600" />
              Relations ({relations.length})
            </h3>
            {loadingRelations ? (
              <p className="text-gray-500 text-sm">Loading relations…</p>
            ) : relations.length === 0 ? (
              <p className="text-gray-500 text-sm">No relations found</p>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y">
                {relations.map((r, idx) => {
                  const name = [r.related?.firstName, r.related?.middleName, r.related?.lastName].filter(Boolean).join(' ');
                  const label = r.relationMarathi ? `${r.relationEnglish} [${r.relationMarathi}]` : r.relationEnglish;
                  return (
                    <Link
                      key={`${r.relationEnglish}-${r.related?.serNo}-${idx}`}
                      to={`/family/member/${r.related?.serNo}`}
                      className="block py-2 hover:bg-gray-50 rounded"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm">
                          <span className="font-medium">{label}</span>
                          <span className="text-gray-500"> → </span>
                          <span>{name}</span>
                        </span>
                        <span className="text-xs text-gray-400">#{r.related?.serNo}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* View tree button */}
          <div className="mt-4">
            <Link 
              to={`/family/tree/${member.serNo}`}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-center flex items-center justify-center"
            >
              <GitBranch className="mr-2" size={16} />
              View Family Tree
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyMemberPage;