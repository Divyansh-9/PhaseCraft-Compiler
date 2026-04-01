import React, { useState } from 'react';
import './SplashScreen.css';
import './SplashModal.css';

interface SplashProps {
  onStart: () => void;
}

interface Member {
  id: number;
  name: string;
  role: string;
  section: string;
  image: string;
  description: string;
}

const SplashScreen: React.FC<SplashProps> = ({ onStart }) => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const members: Member[] = [
    { 
      id: 1, 
      name: "Divyansh Uniyal", 
      role: "Team Lead & System Architect", 
      section: "Section ML2", 
      image: "/member1.jpg", 
      description: "Orchestrated the entire project lifecycle, designed the core compiler architecture, and managed team coordination." 
    },
    { 
      id: 2, 
      name: "Abhishek Negi", 
      role: "Lexical & Syntax Developer", 
      section: "Section C1", 
      image: "/member2.jpg",
      description: "Implemented the Lexer and Recursive Descent Parser to convert source code into tokens and Abstract Syntax Trees." 
    },
    { 
      id: 3, 
      name: "Dharmesh Yadav", 
      role: "Semantic & IR Developer", 
      section: "Section DS2", 
      image: "/member3.jpg",
      description: "Built the Semantic Analyzer for type checking and the Intermediate Code Generator for creating 3-address codes." 
    },
    { 
      id: 4, 
      name: "Mahi Kathayat", 
      role: "Optimization & CodeGen Dev", 
      section: "Section H2", 
      image: "/member4.jpg",
      description: "Developed optimization algorithms to improve code efficiency and handled the final backend code generation." 
    }
  ];

  const handleStart = () => {
    onStart();
  };

  return (
    <div className={`splash-container`}>
      {/* Background with overlay */}
      <div className="splash-background"></div>
      <div className="splash-overlay"></div>

      <div className="splash-content fade-in-up">
        {/* University Branding */}
        <div className="university-header">
          <img 
            src="/logo.png" 
            alt="GEHU Logo" 
            className="uni-logo" 
            onError={(e) => {
              const target = e.currentTarget;
              // Prevent infinite loop if fallback fails
              if (target.src !== 'https://upload.wikimedia.org/wikipedia/en/9/91/Graphic_Era_Hill_University_logo.png') {
                 target.src = 'https://upload.wikimedia.org/wikipedia/en/9/91/Graphic_Era_Hill_University_logo.png';
              } else {
                 target.style.display = 'none';
              }
            }} 
          />
          <h1>Graphic Era Hill University</h1>
        </div>

        {/* Subject Info */}
        <div className="subject-info">
          <p>Subject: Compiler Design Project</p>
        </div>

        {/* Project Title */}
        <div className="project-title-wrapper">
          <h1 className="project-title">UNIVERSAL COMPILER VISUALIZER</h1>
          <div className="title-underline"></div>
        </div>

        {/* Team Members */}
        <div className="team-container">
          <h3 className="team-header-title">PROJECT TEAM</h3>
          <div className="members-grid">
            {members.map((m) => (
              <div key={m.id} className="member-card" onClick={() => setSelectedMember(m)}>
                 <div className="member-avatar">
                   <img 
                      src={m.image} 
                      alt={m.name} 
                      onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=0D8ABC&color=fff&size=128&bold=true` }}
                   />
                 </div>
                 <div className="member-details">
                    <div className="member-name">{m.name}</div>
                    <div className={`member-role ${m.role.includes('Team Lead') ? 'lead' : ''}`}>{m.role}</div>
                    <div className="member-section">{m.section}</div>
                 </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button className="start-btn" onClick={handleStart}>
          <span className="btn-text">Start Project</span>
          <span className="btn-glow"></span>
        </button>
      </div>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedMember(null)}>×</button>
            
            <div className="modal-header-image">
              <img 
                src={selectedMember.image} 
                alt={selectedMember.name}
                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedMember.name)}&background=0D8ABC&color=fff&size=256&bold=true` }} 
              />
            </div>
            
            <h2 className="modal-name">{selectedMember.name}</h2>
            <div className="modal-role-badge">{selectedMember.role}</div>
            <div className="modal-section-badge">{selectedMember.section}</div>
            
            <div className="modal-divider"></div>
            
            <div className="modal-description">
              <h3>Responsibilities</h3>
              <p>{selectedMember.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
