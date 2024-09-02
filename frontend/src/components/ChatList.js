import React from 'react';

const ChatList = ({ sessions, onSelectSession, onDeleteSession }) => {
    return (
        <div className="chat-list">
            {sessions.map((session) => (
                <div key={session._id} className="chat-session">
                    <span
                        className="session-title"
                        onClick={() => onSelectSession(session._id)}
                    >
                        {session.title}
                    </span>
                    <button 
                        className="delete-button"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent click from triggering session selection
                            if (typeof onDeleteSession === 'function') {
                                onDeleteSession(session._id);
                            } else {
                                console.error('onDeleteSession is not a function');
                            }
                        }}
                    >
                        Delete
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ChatList;
