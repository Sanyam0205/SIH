import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import FileUpload from './FileUpload'; // Import the FileUpload component
import './ChatBox.css'; // Ensure you import the CSS file

const ChatBox = ({ sessionId }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null); // Reference to the bottom of the messages list

    useEffect(() => {
        if (sessionId) {
            axios.get(`http://localhost:5000/api/chats/sessions/${sessionId}/chats`)
                .then(response => {
                    const sortedMessages = response.data.reverse();
                    setMessages(sortedMessages);
                })
                .catch(err => console.error(err));
        }
    }, [sessionId]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() && sessionId) {
            try {
                const userMessageResponse = await axios.post(`http://localhost:5000/api/chats/`, {
                    chatId: sessionId,
                    user: 'User',
                    message: newMessage,
                    messageType: 'user',
                });

                setMessages(prevMessages => [...prevMessages, userMessageResponse.data]);

                // Request system response from backend which runs Python script
                try {
                    const systemResponse = await axios.post('http://localhost:5000/api/system-response', { message: newMessage });
                    const systemMessage = {
                        _id: Date.now(),
                        chatId: sessionId,
                        user: 'System',
                        message: systemResponse.data.response,
                        messageType: 'system',
                    };
                    setMessages(prevMessages => [...prevMessages, systemMessage]);

                    await axios.post(`http://localhost:5000/api/chats/`, systemMessage);
                } catch (error) {
                    console.error('Error getting system response:', error);
                }

                setNewMessage('');
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleFileUploaded = async (file) => {
        const fileMessage = {
            _id: Date.now(),
            chatId: sessionId,
            user: 'User',
            message: file.fileName,
            messageType: 'file',
            file: file
        };
        setMessages(prevMessages => [...prevMessages, fileMessage]);

        // Post file message to the server
        try {
            await axios.post(`http://localhost:5000/api/chats/`, fileMessage);

            // Request system response about the uploaded file
            const systemResponse = await axios.post('http://localhost:5000/api/system-response', {
                message: `File uploaded: ${file.fileName}`,
                file: file
            });

            const systemFileResponseMessage = {
                _id: Date.now(),
                chatId: sessionId,
                user: 'System',
                message: systemResponse.data.response,
                messageType: 'system',
            };
            setMessages(prevMessages => [...prevMessages, systemFileResponseMessage]);

            await axios.post(`http://localhost:5000/api/chats/`, systemFileResponseMessage);
        } catch (err) {
            console.error('Failed to post file message or system response:', err);
        }
    };

    return (
        <div className="chatbox">
            <div className="messages">
                {messages.map((msg) => (
                    <div key={msg._id} className={`message ${msg.messageType}`}>
                        <div className="message-content">
                            <strong>{msg.user}:</strong>
                            {msg.messageType === 'file' ? (
                                <div className="file-message">
                                    <a href={`http://localhost:5000/uploads/${msg.file.fileName}`} target="_blank" rel="noopener noreferrer">
                                        <div className="file-icon">
                                            {msg.file.fileName.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                                <img
                                                    src={`http://localhost:5000/uploads/${msg.file.fileName}`}
                                                    alt={msg.file.originalName}
                                                    style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div className="generic-icon" style={{ fontSize: '24px' }}>📄</div>
                                            )}
                                        </div>
                                    </a>
                                </div>
                            ) : (
                                <span>{msg.message}</span>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="chatbox-form">
                <FileUpload onFileUploaded={handleFileUploaded} />
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
};

export default ChatBox;
