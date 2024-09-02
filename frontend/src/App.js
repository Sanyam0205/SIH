import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChatSession from './components/ChatSession';
import ChatList from './components/ChatList';
import ChatBox from './components/ChatBox';
import './App.css';

const App = () => {
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Track sidebar open/close state

    // Fetch sessions from the server
    useEffect(() => {
        axios.get('http://localhost:5000/api/chats/sessions/all')
            .then(response => setSessions(response.data))
            .catch(err => console.error(err));
    }, []);

    const handleSessionCreated = (newSession) => {
        setSessions([newSession, ...sessions]);
        setSelectedSession(newSession._id);
    };

    const handleSelectSession = (sessionId) => {
        setSelectedSession(sessionId);
    };

    const handleDeleteSession = (sessionId) => {
        axios.delete(`http://localhost:5000/api/chats/sessions/${sessionId}`)
            .then(() => {
                setSessions(sessions.filter(session => session._id !== sessionId));
                if (selectedSession === sessionId) {
                    setSelectedSession(null); // Clear selected session if it was deleted
                }
            })
            .catch(err => console.error(err));
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen); // Toggle sidebar state
    };

    return (
        <div className="app">
            <button className="toggle-button" onClick={toggleSidebar}>
                {isSidebarOpen ? '✕' : '☰'} 
                </button>
            <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                
                {isSidebarOpen && (
                    <>
                        <ChatSession onSessionCreated={handleSessionCreated} />
                        <ChatList 
                            sessions={sessions} 
                            onSelectSession={handleSelectSession} 
                            onDeleteSession={handleDeleteSession} 
                        />
                    </>
                )}
            </div>
            <div className="main-chat">
                {selectedSession ? (
                    <ChatBox sessionId={selectedSession} />
                ) : (
                    <div className="empty-chat">Select or create a chat session to start chatting!</div>
                )}
            </div>
        </div>
    );
};

export default App;
