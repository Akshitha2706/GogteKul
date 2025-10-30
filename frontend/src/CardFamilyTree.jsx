import React, { useState } from 'react';
import { ChevronDown, ChevronRight, User } from 'lucide-react';
import './CardFamilyTree.css';

const CardFamilyTree = ({ data, selectedSerNo, onMemberSelect }) => {
  if (!data) return null;
  
  return (
    <div className="card-tree-container">
      <CardTreeNode 
        node={data} 
        level={0} 
        selectedSerNo={selectedSerNo}
        onMemberSelect={onMemberSelect}
      />
    </div>
  );
};

const CardTreeNode = ({ node, level, selectedSerNo, onMemberSelect }) => {
  const [expanded, setExpanded] = useState(true);
  const attributes = node.attributes || {};
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const gender = attributes.gender?.toLowerCase?.() || '';
  const isMale = gender === 'male';
  const serNo = attributes.serNo != null ? Number(attributes.serNo) : null;
  const isSelected = selectedSerNo != null && serNo != null && Number(selectedSerNo) === serNo;
  
  const toggleExpand = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChildren) {
      setExpanded(!expanded);
    }
  };
  
  const handleSelect = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onMemberSelect && serNo != null) {
      onMemberSelect(serNo);
    }
  };
  
  return (
    <div className="card-tree-node-container" style={{ paddingLeft: `${level * 40}px` }}>
      <div 
        className={`card-tree-node ${isMale ? 'male' : 'female'} ${isSelected ? 'selected' : ''}`}
        onClick={handleSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleSelect(e);
          }
        }}
      >
        <div className="card-node-avatar">
          <User size={24} color={isMale ? '#1890ff' : '#eb2f96'} />
        </div>
        
        <div className="card-node-content">
          <div className="card-node-header">
            <button type="button" className="card-node-name" onClick={handleSelect}>
              {node.name}
            </button>
            {serNo != null && (
              <span className="card-node-id">#{serNo}</span>
            )}
          </div>
          
          {attributes.spouse && (
            <div className="card-node-detail">
              <span className="detail-label">Spouse:</span> {attributes.spouse}
            </div>
          )}
          
          {attributes.vansh && (
            <div className="card-node-detail">
              <span className="detail-label">Vansh:</span> {attributes.vansh}
            </div>
          )}
        </div>
        
        {hasChildren && (
          <button 
            type="button"
            className="card-expand-button" 
            onClick={toggleExpand}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
      </div>
      
      {hasChildren && expanded && (
        <div className="card-tree-children">
          {node.children.map((child, index) => (
            <CardTreeNode 
              key={index} 
              node={child} 
              level={level + 1} 
              selectedSerNo={selectedSerNo}
              onMemberSelect={onMemberSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CardFamilyTree;