import React, { useState, useEffect, useRef } from 'react';
import '../App.css'; // Reuse existing styles or add specific ones inline

interface VoiceInputProps {
  onInput: (text: string) => void;
  isListening: boolean;
  onToggle: () => void;
}

// Extend Window interface for WebkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onInput, isListening, onToggle }) => {
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        processSpeech(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (isListening) onToggle(); // Stop on error
      };
    }
  }, []); // Run once

  useEffect(() => {
    if (isListening) {
      recognitionRef.current?.start();
    } else {
      recognitionRef.current?.stop();
    }
  }, [isListening]);

  const processSpeech = (text: string) => {
    console.log("Raw Speech:", text);
    let code = text.toLowerCase();

    // Map phrases to symbols
    code = code.replace(/semicolon/g, ';');
    code = code.replace(/semi colon/g, ';');
    code = code.replace(/equals/g, '=');
    code = code.replace(/equal to/g, '=');
    code = code.replace(/open bracket/g, '{');
    code = code.replace(/close bracket/g, '}');
    code = code.replace(/open brace/g, '{');
    code = code.replace(/close brace/g, '}');
    code = code.replace(/open parenthesis/g, '(');
    code = code.replace(/close parenthesis/g, ')');
    code = code.replace(/new line/g, '\n');
    code = code.replace(/next line/g, '\n');
    code = code.replace(/integer/g, 'int');
    code = code.replace(/plus/g, '+');
    code = code.replace(/minus/g, '-');
    code = code.replace(/times/g, '*');
    code = code.replace(/divided by/g, '/');
    code = code.replace(/print/g, 'print'); // Ensure lowercase

    // Simple heuristic to remove spacing around punctuation if speech engine added it
    code = code.replace(/\s*;\s*/g, '; ');
    code = code.replace(/\s*=\s*/g, ' = ');
    
    onInput(code);
  };

  if (!recognitionRef.current) return null; // Don't render if not supported

  return (
    <button 
      onClick={onToggle}
      className={`voice-btn ${isListening ? 'listening' : ''}`}
      title={isListening ? "Stop Voice Input" : "Start Voice Input"}
      style={{
        zIndex: 100,
        background: isListening ? '#ff4444' : 'var(--accent-primary)',
        border: 'none',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        transition: 'all 0.3s ease'
      }}
    >
      {isListening ? (
        <span className="pulse-ring">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
             <line x1="1" y1="1" x2="23" y2="23"></line>
             <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
             <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
             <line x1="12" y1="19" x2="12" y2="23"></line>
             <line x1="8" y1="23" x2="16" y2="23"></line>
           </svg>
        </span>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      )}
    </button>
  );
};

export default VoiceInput;
