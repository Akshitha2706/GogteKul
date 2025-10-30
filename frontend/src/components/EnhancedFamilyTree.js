import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as d3 from 'd3';
import './EnhancedFamilyTree.css';
import { MemberDetailsModal } from './MemberDetailsModal';

import api from '../utils/api';

// Fetch children by serial numbers
const fetchChildren = async (childrenSerNos) => {
  if (!childrenSerNos || childrenSerNos.length === 0) return [];
  const res = await api.post('/api/family/members/by-sernos', {
    serNos: childrenSerNos.map((value) => Number.isNaN(Number(value)) ? String(value) : Number(value)),
  });
  return Array.isArray(res.data?.members) ? res.data.members : [];
};

// Fetch spouse by serial number
const fetchSpouse = async (spouseSerNo) => {
  if (!spouseSerNo) return null;
  try {
    const res = await api.get(`/api/family/members/by-serno/${spouseSerNo}`);
    return res.data?.member || null;
  } catch (error) {
    return null;
  }
};

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
  </div>
);

// Enhanced Person Card Component
const PersonCard = ({ person, isHighlighted, onClick, isSpouse = false }) => {
  const formatName = (person) => {
    const parts = [person.firstName, person.middleName, person.lastName].filter(Boolean);
    return parts.join(' ') || 'Unknown';
  };

  // Gender-based color coding: Males blue, Females pink
  const getCardColors = () => {
    if (isHighlighted) {
      return 'border-red-500 bg-red-50 shadow-lg';
    }
    
    const isFemale = person.gender === 'Female' || person.gender === 'female';
    return isFemale 
      ? 'border-pink-400 bg-pink-50 hover:border-pink-500 hover:shadow-md'
      : 'border-blue-400 bg-blue-50 hover:border-blue-500 hover:shadow-md';
  };

  return (
    <div
      className={`
        relative cursor-pointer transition-all duration-200 border-2 rounded-lg p-3
        ${getCardColors()}
        w-72 min-h-[200px]
      `}
      onClick={onClick}
    >
      {/* Profile Image or Icon */}
      <div className="flex justify-center mb-4">
        {person.profileImage ? (
          <img 
            src={person.profileImage} 
            alt={formatName(person)}
            className="w-24 h-24 rounded-full object-cover border-3 border-white shadow-lg ring-2 ring-gray-200"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className={`w-24 h-24 rounded-full flex items-center justify-center border-3 border-white shadow-lg ring-2 ring-gray-200 ${
            person.profileImage ? 'hidden' : 'flex'
          } ${person.gender === 'Female' ? 'bg-pink-100' : 'bg-blue-100'}`}
        >
          <svg 
            className={`w-12 h-12 ${person.gender === 'Female' ? 'text-pink-500' : 'text-blue-500'}`} 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      </div>

      {/* Name Header */}
      <div className="text-center mb-3 pb-2 border-b border-gray-200">
        <h3 className={`font-bold text-lg leading-tight ${isHighlighted ? 'text-red-800' : 'text-gray-800'}`}>
          {formatName(person)}
        </h3>
        {person.vansh && <p className="text-xs text-gray-600 mt-1">{person.vansh}</p>}
      </div>
      {/* Details in grid layout */}
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
        <div className="col-span-2 text-center mb-2">
          <span className="font-mono bg-white px-2 py-0.5 rounded border">ID: {person.serNo}</span>
          {person.level !== undefined && (
            <span className="bg-white px-2 py-0.5 rounded border ml-2">Level {person.level}</span>
          )}
        </div>
        {/* Personal Details */}
        <div className="col-span-2 grid grid-cols-2 gap-1">
          {person.dob && (
            <div className="flex flex-col">
              <span className="text-gray-500 font-medium">Born:</span>
              <span>{person.dob}</span>
            </div>
          )}
          {person.dod && (
            <div className="flex flex-col">
              <span className="text-gray-500 font-medium">Died:</span>
              <span>{person.dod}</span>
            </div>
          )}
          {person.birthPlace && (
            <div className="flex flex-col col-span-2 mt-1">
              <span className="text-gray-500 font-medium">Birthplace:</span>
              <span>{person.birthPlace}</span>
            </div>
          )}
          {person.occupation && (
            <div className="flex flex-col col-span-2 mt-1">
              <span className="text-gray-500 font-medium">Occupation:</span>
              <span>{person.occupation}</span>
            </div>
          )}
          {person.education && (
            <div className="flex flex-col col-span-2 mt-1">
              <span className="text-gray-500 font-medium">Education:</span>
              <span>{person.education}</span>
            </div>
          )}
          {person.address && (
            <div className="flex flex-col col-span-2 mt-1">
              <span className="text-gray-500 font-medium">Address:</span>
              <span className="line-clamp-2">{person.address}</span>
            </div>
          )}
        </div>
        {/* Family Connections */}
        <div className="col-span-2 mt-2 pt-2 border-t border-gray-200 flex justify-between">
          {person.fatherSerNo && (
            <div className="text-center">
              <span className="text-xs text-blue-600 font-medium">Father ID: {person.fatherSerNo}</span>
            </div>
          )}
          {person.motherSerNo && (
            <div className="text-center">
              <span className="text-xs text-pink-600 font-medium">Mother ID: {person.motherSerNo}</span>
            </div>
          )}
        </div>
        {person.childrenSerNos && person.childrenSerNos.length > 0 && (
          <div className="col-span-2 text-center mt-1">
            <span className="text-xs text-green-600 font-medium">
              {person.childrenSerNos.length} child{person.childrenSerNos.length > 1 ? 'ren' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const EnhancedFamilyTree = () => {
  const width = 900;
  const height = 900;
  const [loading, setLoading] = useState(true);
  const [allMembers, setAllMembers] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [zoomLevel, setZoomLevel] = useState(0.5);
  const [loadingNodes, setLoadingNodes] = useState(new Set());
  const [selectedMember, setSelectedMember] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const zoomBehavior = useRef();

  // Load all family members
  useEffect(() => {
    async function loadAllMembers() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all members to build complete hierarchy
        const res = await api.get('/api/family/members');
        const members = Array.isArray(res.data?.members) ? res.data.members : [];

        const membersWithSpouses = await Promise.all(
          members.map(async (member) => {
            if (member.spouseSerNo) {
              const spouse = await fetchSpouse(member.spouseSerNo);
              return { ...member, spouse };
            }
            return member;
          })
        );

        setAllMembers(membersWithSpouses);
      } catch (err) {
        console.error('Error loading family tree:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAllMembers();
  }, []);

  React.useEffect(() => {
  const handler = (e) => {
    if (e.ctrlKey && e.type === "wheel") {
      // stop browser from zooming the page
      e.preventDefault();
    }
  };

  window.addEventListener("wheel", handler, { passive: false });
  return () => window.removeEventListener("wheel", handler);
}, []);

  // Handle member card clicks to show details modal
  const handleMemberClick = useCallback((member) => {
    console.log('Member clicked:', member);
    setSelectedMember(member);
    setIsModalOpen(true);
  }, []);

  // Close modal handler
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedMember(null);
  }, []);

  // Process data for D3 visualization
  const processData = useCallback(() => {
    if (!allMembers || allMembers.length === 0) return [];

    // Create a map of all members by serNo for quick lookup
    const memberMap = new Map();
    allMembers.forEach(member => {
      memberMap.set(member.serNo.toString(), member);
    });

    // Create couple nodes (husband as primary, wife as spouse)
    const coupleMap = new Map();
    allMembers.forEach(member => {
      // Create a unique key for each couple
      const coupleKey = member.spouseSerNo
        ? `${Math.min(member.serNo, member.spouseSerNo)}-${Math.max(member.serNo, member.spouseSerNo)}`
        : member.serNo.toString();

      // Skip if this couple is already processed
      if (coupleMap.has(coupleKey)) return;

      // Find spouse if exists
      const spouse = member.spouseSerNo ? allMembers.find(m => m.serNo === member.spouseSerNo) : null;

      // Determine who should be primary (husband) and who should be spouse (wife)
      let primary, spousePartner;
      if (spouse) {
        if (member.gender === 'Male') {
          primary = member;
          spousePartner = spouse;
        } else if (spouse.gender === 'Male') {
          primary = spouse;
          spousePartner = member;
        } else {
          // If both same gender or unknown, use original member as primary
          primary = member;
          spousePartner = spouse;
        }
      } else {
        primary = member;
        spousePartner = null;
      }

      // Create couple node with husband as primary
      const coupleNode = {
        id: coupleKey,
        primary: primary,
        spouse: spousePartner,
        children: [],
      };

      coupleMap.set(coupleKey, coupleNode);
    });

    // Connect parents and children
    const expandedSet = expandedNodes;
    Array.from(coupleMap.values()).forEach(couple => {
      const coupleKey = couple.id;

      // Find children for this couple
      let children = [];
      if (couple.primary.childrenSerNos && couple.primary.childrenSerNos.length > 0) {
        children = couple.primary.childrenSerNos
          .map(serNo => memberMap.get(serNo.toString()))
          .filter(Boolean);
      }

      if (expandedSet.has(coupleKey)) {
        couple.children = children.map(child => {
          // Attach child as a couple node if they have a spouse, else as single
          if (child.spouseSerNo) {
            const childCoupleKey = child.spouseSerNo < child.serNo
              ? `${child.spouseSerNo}-${child.serNo}`
              : `${child.serNo}-${child.spouseSerNo}`;
            return coupleMap.get(childCoupleKey);
          } else {
            return coupleMap.get(child.serNo.toString());
          }
        }).filter(Boolean);
      } else {
        couple.children = [];
      }
    });

    // Find root couples: those whose primary (or spouse) is not a biological child of anyone (paternal line only)
    const allChildSerNos = new Set();
    allMembers.forEach(child => {
      // Only consider father connections (paternal line)
      if (child.fatherSerNo) allChildSerNos.add(child.serNo);
    });

    const allRootCouples = Array.from(coupleMap.values()).filter(couple => {
      // For couples, only check if the HUSBAND is a root (ignore wife's lineage)
      if (couple.spouse) {
        // Determine who is the husband (male) and who is the wife (female)
        const husband = couple.primary.gender === 'Male' ? couple.primary : couple.spouse;
        const wife = couple.primary.gender === 'Female' ? couple.primary : couple.spouse;
        
        // Only check if husband is a root node (ignore wife's father/mother)
        return !allChildSerNos.has(husband.serNo);
      } else {
        // For single people, check normally
        return !allChildSerNos.has(couple.primary.serNo);
      }
    });

    // Force serNo 1 and 2 as THE root nodes (ignore natural parentage for these specific people)
    let rootCouples = [];
    const targetSerNos = [1, 2];
    let targetRoot = null;
    
    // Look for serNo 1 first, then serNo 2 in ALL couples (not just natural roots)
    for (const targetSerNo of targetSerNos) {
      targetRoot = Array.from(coupleMap.values()).find(couple => {
        const primaryMatch = couple.primary.serNo === targetSerNo || 
                           couple.primary.serNo === targetSerNo.toString() ||
                           parseInt(couple.primary.serNo) === targetSerNo;
        const spouseMatch = couple.spouse && (
                           couple.spouse.serNo === targetSerNo || 
                           couple.spouse.serNo === targetSerNo.toString() ||
                           parseInt(couple.spouse.serNo) === targetSerNo);
        return primaryMatch || spouseMatch;
      });
      
      if (targetRoot) {
        console.log(`[ENHANCED] Force-setting serNo ${targetSerNo} as root couple`);
        break;
      }
    }
    
    if (targetRoot) {
      rootCouples = [targetRoot];
    } else if (allRootCouples.length > 0) {
      // Fallback to natural roots if serNo 1/2 not found
      const ramkrishnaRoot = allRootCouples.find(couple => {
        const primaryName = `${couple.primary.firstName} ${couple.primary.lastName}`.toLowerCase();
        return primaryName.includes('ramkrishna') && primaryName.includes('gogte');
      });
      
      if (ramkrishnaRoot) {
        rootCouples = [ramkrishnaRoot];
      } else {
        const sortedRoots = allRootCouples.sort((a, b) => {
          const nameA = `${a.primary.firstName} ${a.primary.lastName}`.toLowerCase();
          const nameB = `${b.primary.firstName} ${b.primary.lastName}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
        rootCouples = [sortedRoots[0]];
      }
    }

    return rootCouples;
  }, [allMembers, expandedNodes]);

  // Toggle expand/collapse for a node
  const handleToggleExpand = useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) newSet.delete(nodeId);
      else newSet.add(nodeId);
      return newSet;
    });
  }, []);

  // Handle node click to highlight
  const handleNodeClick = useCallback((nodeId) => {
    setHighlightedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) newSet.delete(nodeId);
      else newSet.add(nodeId);
      return newSet;
    });
  }, []);

  // Use fetchChildren in handleExpand function
  const handleExpand = async (node) => {
    if (loadingNodes.has(node.serNo)) return;

    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(node.serNo)) {
      newExpanded.delete(node.serNo);
      setExpandedNodes(newExpanded);
      return;
    }

    setLoadingNodes(new Set([...loadingNodes, node.serNo]));

    // Use fetchChildren here
    if (!node.children && node.childrenSerNos?.length > 0) {
      const children = await fetchChildren(node.childrenSerNos);
      node.children = children.map(child => ({
        ...child,
        spouse: child.spouseSerNo ? allMembers.find(m => m.serNo === child.spouseSerNo) : null
      }));
    }

    newExpanded.add(node.serNo);
    setExpandedNodes(newExpanded);
    setLoadingNodes(new Set([...loadingNodes].filter(id => id !== node.serNo)));
  };


  // --- 2. Render tree into <g> whenever data changes ---
  useEffect(() => {
    if (!allMembers.length || !svgRef.current) return;
    
    // Store current transform before clearing
    const svg = d3.select(svgRef.current);
    const currentTransform = svg.node().__zoom || d3.zoomIdentity.translate(width / 2, 100).scale(0.5);
    
    d3.select(svgRef.current).selectAll('*').remove();
    const nodeWidth = 280;
    const nodeHeight = 220; // Increased height for larger profile pictures
    const horizontalSpacing = 120;
    const verticalSpacing = 120; // Increased spacing for better layout
    const container = svg.append('g');
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .filter((event) => {
        if (event.type === "mousedown" || event.type === "touchstart") return true;
        if (event.type === "wheel" && event.ctrlKey) return true;
        if (event.type === "wheel" && event.ctrlKey) return true;
        return false;
      })
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
        setZoomLevel(event.transform.k);
      });
    svg.call(zoom);
    zoomBehavior.current = zoom;
    
    // Restore the previous transform instead of resetting to root
    svg.call(zoom.transform, currentTransform);
    const data = processData();
    if (!data.length) return;
    const root = d3.hierarchy({ id: 'root', children: data }).sum(d => d.children ? 0 : 1);
    const treeLayout = d3.tree()
      .nodeSize([nodeWidth + horizontalSpacing, nodeHeight + verticalSpacing])
      .separation((a, b) => a.parent === b.parent ? 1.5 : 2.0);
    treeLayout(root);
    const links = container.selectAll('.link')
      .data(root.links().filter(d => d.source.data.id !== 'root'))
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d => {
        const sourceX = d.source.x;
        const sourceY = d.source.y + nodeHeight / 2;
        const targetX = d.target.x;
        const targetY = d.target.y - 10;
        return `M${sourceX},${sourceY} C${sourceX},${(sourceY + targetY) / 2} ${targetX},${(sourceY + targetY) / 2} ${targetX},${targetY}`;
      })
      .attr('fill', 'none')
      .attr('stroke', d => {
        const sourceId = d.source.data.id;
        const targetId = d.target.data.id;
        return highlightedNodes.has(sourceId) || highlightedNodes.has(targetId) ? '#f97316' : '#f59e0b';
      })
      .attr('stroke-width', d => {
        const sourceId = d.source.data.id;
        const targetId = d.target.data.id;
        return highlightedNodes.has(sourceId) || highlightedNodes.has(targetId) ? 3 : 2;
      })
      .attr('stroke-linecap', 'round');

    // Draw nodes
    const nodes = container.selectAll('.node')
      .data(root.descendants().filter(d => d.data.id !== 'root'))
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x - nodeWidth / 2},${d.y - nodeHeight / 2})`);

    nodes.append('rect')
      .attr('width', d => d.data.spouse ? nodeWidth * 2 + 20 : nodeWidth)
      .attr('height', nodeHeight)
      .attr('rx', 8)
      .attr('fill', 'rgba(255, 251, 235, 0.9)')
      .attr('stroke', d => highlightedNodes.has(d.data.id) ? '#f97316' : '#f59e0b')
      .attr('stroke-width', d => highlightedNodes.has(d.data.id) ? 3 : 2);

    nodes.filter(d => {
      const hasChildren = d.data.primary.childrenSerNos && d.data.primary.childrenSerNos.length > 0;
      return hasChildren;
    })
      .append('foreignObject')
      .attr('x', d => d.data.spouse ? nodeWidth - 12 : nodeWidth / 2 - 12)
      .attr('y', nodeHeight - 12)
      .attr('width', 24)
      .attr('height', 24)
      .html(d => {
        const id = d.data.id;
        const isExpanded = expandedNodes.has(id);
        return `
        <div class="expand-btn" data-id="${id}" style="
          width: 24px; 
          height: 24px; 
          background-color: ${isExpanded ? '#ef4444' : '#22c55e'}; 
          color: white; 
          border-radius: 4px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          cursor: pointer; 
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">
          ${isExpanded ? '-' : '+'}
        </div>
      `;
      });

    // Render primary card only if d.data.primary exists
    const primaryCards = nodes.append('foreignObject')
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .html(d => {
        const person = d.data.primary;
        const isHighlighted = highlightedNodes.has(d.data.id);
        const formatName = (p) => {
          const parts = [p.firstName, p.middleName, p.lastName].filter(Boolean);
          return parts.join(' ') || 'Unknown';
        };
        return `
          <div class="person-card primary" data-id="${d.data.id}" data-serno="${person.serNo}" style="
            height: 100%;
            padding: 8px;
            border-radius: 8px;
            background-color: ${isHighlighted ? '#fee2e2' : '#eff6ff'};
            border: 2px solid ${isHighlighted ? '#ef4444' : '#93c5fd'};
            overflow: hidden;
            transition: all 0.2s;
            cursor: pointer;
          ">
            <div style="text-align: center; margin-bottom: 8px;">
              ${person.profileImage ? `
                <img src="${person.profileImage}" alt="${formatName(person)}" style="
                  width: 70px; 
                  height: 70px; 
                  border-radius: 50%; 
                  object-fit: cover; 
                  border: 3px solid white; 
                  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                  margin: 0 auto;
                " onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
                <div style="
                  width: 70px; 
                  height: 70px; 
                  border-radius: 50%; 
                  background-color: ${person.gender === 'Female' ? '#fce7f3' : '#dbeafe'}; 
                  border: 3px solid white; 
                  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                  display: none;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto;
                ">
                  <svg width="35" height="35" fill="${person.gender === 'Female' ? '#ec4899' : '#3b82f6'}" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              ` : `
                <div style="
                  width: 70px; 
                  height: 70px; 
                  border-radius: 50%; 
                  background-color: ${person.gender === 'Female' ? '#fce7f3' : '#dbeafe'}; 
                  border: 3px solid white; 
                  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto;
                ">
                  <svg width="35" height="35" fill="${person.gender === 'Female' ? '#ec4899' : '#3b82f6'}" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              `}
            </div>
            <div style="text-align: center; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="font-weight: bold; font-size: 14px; color: ${isHighlighted ? '#b91c1c' : '#1e40af'};">
                ${formatName(person)}
              </h3>
              ${person.vansh ? `<p style="font-size: 11px; color: #4b5563;">${person.vansh}</p>` : ''}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px;">
              <div style="grid-column: span 2; text-align: center; margin-bottom: 4px;">
                <span style="background: white; padding: 2px 6px; border-radius: 4px; border: 1px solid #e5e7eb;">
                  ID: ${person.serNo}
                </span>
                ${person.level !== undefined ? `
                  <span style="background: white; padding: 2px 6px; border-radius: 4px; border: 1px solid #e5e7eb; margin-left: 4px;">
                    Level ${person.level}
                  </span>
                ` : ''}
              </div>
              ${person.dob ? `
                <div style="display: flex; flex-direction: column;">
                  <span style="color: #6b7280; font-weight: 500;">Born:</span>
                  <span>${person.dob}</span>
                </div>
              ` : ''}
              ${person.dod ? `
                <div style="display: flex; flex-direction: column;">
                  <span style="color: #6b7280; font-weight: 500;">Died:</span>
                  <span>${person.dod}</span>
                </div>
              ` : ''}
              ${person.birthPlace ? `
                <div style="display: flex; flex-direction: column; grid-column: span 2; margin-top: 4px;">
                  <span style="color: #6b7280; font-weight: 500;">Birthplace:</span>
                  <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${person.birthPlace}</span>
                </div>
              ` : ''}
              ${person.occupation ? `
                <div style="display: flex; flex-direction: column; grid-column: span 2; margin-top: 4px;">
                  <span style="color: #6b7280; font-weight: 500;">Occupation:</span>
                  <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${person.occupation}</span>
                </div>
              ` : ''}
              <div style="grid-column: span 2; margin-top: 6px; padding-top: 4px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between;">
                ${person.fatherSerNo ? `
                  <div style="text-align: center;">
                    <span style="font-size: 10px; color: #2563eb; font-weight: 500;">Father: ${person.fatherSerNo}</span>
                  </div>
                ` : ''}
                ${person.motherSerNo ? `
                  <div style="text-align: center;">
                    <span style="font-size: 10px; color: #db2777; font-weight: 500;">Mother: ${person.motherSerNo}</span>
                  </div>
                ` : ''}
              </div>
              ${person.childrenSerNos && person.childrenSerNos.length > 0 ? `
                <div style="grid-column: span 2; text-align: center; margin-top: 4px;">
                  <span style="font-size: 10px; color: #16a34a; font-weight: 500;">
                    ${person.childrenSerNos.length} child${person.childrenSerNos.length > 1 ? 'ren' : ''}
                  </span>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      });

    // Render spouse card only if d.data.spouse exists
    nodes.filter(d => d.data.spouse)
      .append('foreignObject')
      .attr('x', nodeWidth + 20)
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .html(d => {
        const spouse = d.data.spouse;
        const isHighlighted = highlightedNodes.has(d.data.id);
        const formatName = (p) => {
          const parts = [p.firstName, p.middleName, p.lastName].filter(Boolean);
          return parts.join(' ') || 'Unknown';
        };
        return `
          <div class="person-card spouse" data-id="${d.data.id}" data-serno="${spouse.serNo}" style="
            height: 100%;
            padding: 8px;
            border-radius: 8px;
            background-color: ${isHighlighted ? '#fee2e2' : '#fdf2f8'};
            border: 2px solid ${isHighlighted ? '#ef4444' : '#f9a8d4'};
            overflow: hidden;
            transition: all 0.2s;
            cursor: pointer;
          ">
            <div style="text-align: center; margin-bottom: 8px;">
              ${spouse.profileImage ? `
                <img src="${spouse.profileImage}" alt="${formatName(spouse)}" style="
                  width: 70px; 
                  height: 70px; 
                  border-radius: 50%; 
                  object-fit: cover; 
                  border: 3px solid white; 
                  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                  margin: 0 auto;
                " onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
                <div style="
                  width: 70px; 
                  height: 70px; 
                  border-radius: 50%; 
                  background-color: ${spouse.gender === 'Female' ? '#fce7f3' : '#dbeafe'}; 
                  border: 3px solid white; 
                  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                  display: none;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto;
                ">
                  <svg width="35" height="35" fill="${spouse.gender === 'Female' ? '#ec4899' : '#3b82f6'}" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              ` : `
                <div style="
                  width: 70px; 
                  height: 70px; 
                  border-radius: 50%; 
                  background-color: ${spouse.gender === 'Female' ? '#fce7f3' : '#dbeafe'}; 
                  border: 3px solid white; 
                  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto;
                ">
                  <svg width="35" height="35" fill="${spouse.gender === 'Female' ? '#ec4899' : '#3b82f6'}" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              `}
            </div>
            <div style="text-align: center; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="font-weight: bold; font-size: 14px; color: ${isHighlighted ? '#b91c1c' : '#9d174d'};">
                ${formatName(spouse)}
              </h3>
              ${spouse.vansh ? `<p style="font-size: 11px; color: #4b5563;">${spouse.vansh}</p>` : ''}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px;">
              <div style="grid-column: span 2; text-align: center; margin-bottom: 4px;">
                <span style="background: white; padding: 2px 6px; border-radius: 4px; border: 1px solid #e5e7eb;">
                  ID: ${spouse.serNo}
                </span>
                ${spouse.level !== undefined ? `
                  <span style="background: white; padding: 2px 6px; border-radius: 4px; border: 1px solid #e5e7eb; margin-left: 4px;">
                    Level ${spouse.level}
                  </span>
                ` : ''}
              </div>
              ${spouse.dob ? `
                <div style="display: flex; flex-direction: column;">
                  <span style="color: #6b7280; font-weight: 500;">Born:</span>
                  <span>${spouse.dob}</span>
                </div>
              ` : ''}
              ${spouse.dod ? `
                <div style="display: flex; flex-direction: column;">
                  <span style="color: #6b7280; font-weight: 500;">Died:</span>
                  <span>${spouse.dod}</span>
                </div>
              ` : ''}
              ${spouse.birthPlace ? `
                <div style="display: flex; flex-direction: column; grid-column: span 2; margin-top: 4px;">
                  <span style="color: #6b7280; font-weight: 500;">Birthplace:</span>
                  <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${spouse.birthPlace}</span>
                </div>
              ` : ''}
              ${spouse.occupation ? `
                <div style="display: flex; flex-direction: column; grid-column: span 2; margin-top: 4px;">
                  <span style="color: #6b7280; font-weight: 500;">Occupation:</span>
                  <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${spouse.occupation}</span>
                </div>
              ` : ''}
              <div style="grid-column: span 2; margin-top: 6px; padding-top: 4px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between;">
                ${spouse.fatherSerNo ? `
                  <div style="text-align: center;">
                    <span style="font-size: 10px; color: #2563eb; font-weight: 500;">Father: ${spouse.fatherSerNo}</span>
                  </div>
                ` : ''}
                ${spouse.motherSerNo ? `
                  <div style="text-align: center;">
                    <span style="font-size: 10px; color: #db2777; font-weight: 500;">Mother: ${spouse.motherSerNo}</span>
                  </div>
                ` : ''}
              </div>
              ${spouse.childrenSerNos && spouse.childrenSerNos.length > 0 ? `
                <div style="grid-column: span 2; text-align: center; margin-top: 4px;">
                  <span style="font-size: 10px; color: #16a34a; font-weight: 500;">
                    ${spouse.childrenSerNos.length} child${spouse.childrenSerNos.length > 1 ? 'ren' : ''}
                  </span>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      });

    // Add marriage connection line
    nodes.filter(d => d.data.spouse)
      .append('line')
      .attr('x1', nodeWidth)
      .attr('y1', nodeHeight / 2)
      .attr('x2', nodeWidth + 20)
      .attr('y2', nodeHeight / 2)
      .attr('stroke', d => highlightedNodes.has(d.data.id) ? '#f97316' : '#f59e0b')
      .attr('stroke-width', d => highlightedNodes.has(d.data.id) ? 3 : 2)
      .attr('stroke-linecap', 'round');

    // Hover effects for links
    links.on('mouseover', function () {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('stroke-width', 4);
    }).on('mouseout', function (event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('stroke-width', highlightedNodes.has(d.source.data.id) || highlightedNodes.has(d.target.data.id) ? 3 : 2);
    });

    // Hover effects for primary cards
    primaryCards.on('mouseover', function () {
      d3.select(this)
        .transition()
        .duration(200)
        .style('transform', 'scale(1.02)');
    }).on('mouseout', function () {
      d3.select(this)
        .transition()
        .duration(200)
        .style('transform', 'scale(1)');
    });

    // Add click handlers
    svg.selectAll('.expand-btn').on('click', function (event) {
      event.stopPropagation();
      const nodeId = this.getAttribute('data-id');
      handleToggleExpand(nodeId);
    });

    svg.selectAll('.person-card').on('click', function (event) {
      event.stopPropagation();
      const serNo = this.getAttribute('data-serno');
      
      if (serNo) {
        // Find the member directly from allMembers array using serial number
        const member = allMembers.find(m => m.serNo.toString() === serNo.toString());
        
        if (member) {
          console.log('Opening modal for member:', member);
          handleMemberClick(member);
        } else {
          console.log('No member found with serNo:', serNo);
        }
      } else {
        console.log('No data-serno attribute found');
      }
    });
  }, [processData, highlightedNodes, expandedNodes, handleToggleExpand, handleNodeClick, handleMemberClick, allMembers, zoomLevel]);

  // --- 3. Zoom button handlers ---
  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomBehavior.current.scaleBy, 1.2);
  };
  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomBehavior.current.scaleBy, 0.8);
  };
  const handleResetZoom = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      zoomBehavior.current.transform,
      d3.zoomIdentity.translate(width / 2, 100).scale(0.5)
    );
  };

  // Search functionality
  const filteredMembers = searchTerm
    ? allMembers.filter(member => {
      const fullName = [member.firstName, member.middleName, member.lastName].filter(Boolean).join(' ').toLowerCase();
      return fullName.includes(searchTerm.toLowerCase()) || member.serNo.toString().includes(searchTerm);
    })
    : [];

  const handleSearchSelect = (member) => {
    const coupleKey = member.spouseSerNo
      ? `${Math.min(member.serNo, member.spouseSerNo)}-${Math.max(member.serNo, member.spouseSerNo)}`
      : member.serNo.toString();
    setHighlightedNodes(new Set([coupleKey]));
    // Only connect through fathers (paternal line)
    if (member.fatherSerNo) {
      const parentMember = allMembers.find(m => m.serNo === member.fatherSerNo);
      if (parentMember) {
        const parentCoupleKey = parentMember.spouseSerNo
          ? `${Math.min(parentMember.serNo, parentMember.spouseSerNo)}-${Math.max(parentMember.serNo, parentMember.spouseSerNo)}`
          : parentMember.serNo.toString();
        setExpandedNodes(prev => {
          const newSet = new Set(prev);
          newSet.add(parentCoupleKey);
          return newSet;
        });
      }
    }
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <div className="text-xl font-semibold text-gray-700">Loading Family Tree</div>
          <div className="text-sm text-gray-500">Please wait while we gather your family data...</div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Family Tree</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  if (!loading && allMembers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Family Tree</h1>
            <p className="text-gray-600">No family members found. Please check your database connection.</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col relative">
      {/* Controls Bar */}
      <div className="bg-white shadow-md p-4 sticky top-0 z-10">
        <div className="container mx-auto flex flex-wrap justify-between items-center gap-4">
          {/* Search */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            {searchTerm && filteredMembers.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredMembers.map(member => (
                  <div
                    key={member.serNo}
                    className="px-4 py-2 hover:bg-orange-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => handleSearchSelect(member)}
                  >
                    <div className="font-medium">
                      {[member.firstName, member.middleName, member.lastName].filter(Boolean).join(' ')}
                    </div>
                    <div className="text-xs text-gray-500">ID: {member.serNo}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title="Zoom Out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title="Reset Zoom"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title="Zoom In"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <span className="ml-2 text-gray-500 text-sm">{Math.round(zoomLevel * 100)}%</span>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex justify-center flex-wrap gap-4 text-sm text-gray-600 py-4 px-4">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
          <div className="w-4 h-0.5 bg-amber-400"></div>
          <span>Family Connection</span>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
          <div className="w-4 h-0.5 bg-orange-500"></div>
          <span>Highlighted Relationship</span>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
          <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
          <span>Expand</span>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
          <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
          <span>Collapse</span>
        </div>
      </div>
      {/* D3 Family Tree Container */}
      <div
        ref={containerRef}
        className="flex-1 flex justify-center items-center bg-white shadow-inner overflow-hidden"
        style={{
          minHeight: height,
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          className="family-tree-svg"
          style={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        />
      </div>
      {/* Instructions */}
      <div className="bg-white p-4 text-center text-sm text-gray-600">
        <p>Click on a person to view detailed information. Use the +/- buttons to expand or collapse branches.</p>
        <p className="mt-2 text-xs">
          <span className="inline-block w-3 h-3 bg-blue-400 rounded mr-2"></span>Males (Blue)
          <span className="inline-block w-3 h-3 bg-pink-400 rounded mr-2 ml-4"></span>Females (Pink)
          <span className="ml-4 text-gray-500">• Family tree follows paternal lineage only</span>
          <span className="ml-4 text-gray-500">• Wives join husband's family line</span>
        </p>
      </div>

      {/* Member Details Modal */}
      <MemberDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        member={selectedMember}
      />
    </div>
  );
};

export default EnhancedFamilyTree;