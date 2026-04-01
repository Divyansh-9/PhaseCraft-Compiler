import React, { useState, useEffect, useRef } from 'react';
import { AIService, type AIResponse } from '../services/AIService';
import '../App.css'; // Reusing global styles

interface AIAssistantProps {
  code: string;
  error: string | null;
  language: string;
  onApplyFix: (newCode: string) => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ code, error, language, onApplyFix }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => setIsOpen(!isOpen);

  const addMessage = (msg: AIResponse) => {
    setMessages(prev => [...prev, msg]);
  };

  const handleAction = async (action: 'analyze' | 'fix' | 'optimize') => {
    setLoading(true);
    try {
      let response: AIResponse;
      if (action === 'analyze') {
        response = await AIService.analyzeCode(code, error, language);
      } else if (action === 'fix') {
         response = await AIService.fixCode(code, error, language);
      } else {
         response = await AIService.optimizeCode(code);
      }
      addMessage(response);
    } catch (e: any) {
      addMessage({ message: `Error: ${e.message || "I encountered an error processing your request."}`, type: 'chat' });
    }
    setLoading(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  return (
    <div className={`ai-assistant-container ${isOpen ? 'open' : ''}`}>
       {/* Toggle Button */}
       <button 
         className="ai-toggle-btn"
         onClick={toggleOpen}
         title="AI Assistant"
       >
         {isOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
         ) : (
             <div className="ai-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                {error && <span className="error-badge">!</span>}
             </div>
         )}
       </button>

       {/* Chat Panel */}
       {isOpen && (
         <div className="ai-panel">
            <div className="ai-header">
              <h3>AI Assistant</h3>
              <span className="ai-status">{loading ? 'Thinking...' : 'Ready'}</span>
            </div>

            <div className="ai-messages">
               {messages.length === 0 && (
                 <div className="ai-welcome">
                    <p>Hi! I'm your AI coding assistant. How can I help?</p>
                 </div>
               )}
               {messages.map((msg, idx) => (
                 <div key={idx} className={`ai-message ${msg.type}`}>
                    <div className="ai-msg-content">{msg.message}</div>
                    {msg.fixedCode && (
                      <div className="ai-suggestion">
                         <pre>{msg.fixedCode}</pre>
                         <button onClick={() => onApplyFix(msg.fixedCode!)}>Apply Fix</button>
                      </div>
                    )}
                 </div>
               ))}
               <div ref={messagesEndRef} />
            </div>

            <div className="ai-actions">
               <button onClick={() => handleAction('analyze')} disabled={loading}>Analyze</button>
               <button onClick={() => handleAction('fix')} disabled={loading} className={error ? 'highlight' : ''}>Fix Code</button>
               <button onClick={() => handleAction('optimize')} disabled={loading}>Optimize</button>
            </div>
         </div>
       )}
    </div>
  );
};

export default AIAssistant;
