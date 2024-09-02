import React from 'react';

const ChatHistory = ({ sessions, onSessionSelect }) => {
    return (
        <div className="chat-history">
            {sessions.map((session) => (
                <div
                    key={session._id}
                    className="chat-session"
                    onClick={() => onSessionSelect(session._id)}
                >
                    <strong>{session.title}</strong>
                </div>
            ))}
        </div>
    );
};

export default ChatHistory;
