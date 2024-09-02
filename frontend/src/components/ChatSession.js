import React, { useState } from 'react';
import axios from 'axios';

const ChatSession = ({ onSessionCreated }) => {
    const [title, setTitle] = useState('');

    const handleCreateSession = (e) => {
        e.preventDefault();
        axios.post('http://localhost:5000/api/chats/sessions', { title })
            .then(response => {
                onSessionCreated(response.data);
                setTitle('');
            })
            .catch(err => console.error(err));
    };

    return (
        <form onSubmit={handleCreateSession} className="chat-session-form">
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="New Chat Session..."
            />
            <button type="submit">Create</button>
        </form>
    );
};

export default ChatSession;
