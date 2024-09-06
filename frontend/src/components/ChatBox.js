import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import FileUpload from './FileUpload'; // Import the FileUpload component
import ImageUpload from './Images'; // Import the ImageUpload component
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
            // Optimistically add the user's message to the chatbox
            const tempMessage = {
                _id: Date.now(), // Temporary ID for rendering immediately
                chatId: sessionId,
                user: 'User',
                message: newMessage,
                messageType: 'user',
            };
    
            // Add the user's message to the messages state
            setMessages((prevMessages) => [...prevMessages, tempMessage]);
    
            try {
                // Send the user message to the server
                const userMessageResponse = await axios.post(`http://localhost:5000/api/chats/`, {
                    chatId: sessionId,
                    user: 'User',
                    message: newMessage,
                    messageType: 'user',
                });
    
                // Optionally replace the temp message with the server response (this step can be skipped)
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg._id === tempMessage._id ? userMessageResponse.data : msg
                    )
                );
    
                // Trigger Python script and get system response
                const systemResponse = await axios.post(`http://localhost:5000/api/chats/python-response`, {
                    chatId: sessionId,
                    message: newMessage,
                });
    
                // Add the system's response message
                const systemMessage = {
                    _id: Date.now(),
                    chatId: sessionId,
                    user: 'System',
                    message: systemResponse.data.message,
                    messageType: 'system',
                };
    
                // Append the system message to the chat
                setMessages((prevMessages) => [...prevMessages, systemMessage]);
    
                // Clear the input field
                setNewMessage('');
            } catch (error) {
                console.error('Error sending message:', error);
    
                // Optionally, you can handle error by removing the temp message
                setMessages((prevMessages) => prevMessages.filter(msg => msg._id !== tempMessage._id));
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

            // Create and save fixed system response about the uploaded file
            const systemFileResponseMessage = {
                _id: Date.now(),
                chatId: sessionId,
                user: 'System',
                message: 'ok',
                messageType: 'system',
            };

            // Add the system file response to the chat
            setMessages(prevMessages => [...prevMessages, systemFileResponseMessage]);

            // Save the system file response to database
            await axios.post(`http://localhost:5000/api/chats/`, systemFileResponseMessage);
        } catch (err) {
            console.error('Failed to post file message or system response:', err);
        }
    };

    const handleImageUploaded = async (file) => {
        const imageMessage = {
            _id: Date.now(),
            chatId: sessionId,
            user: 'User',
            message: file.name,
            messageType: 'image',
            file: file
        };

        setMessages(prevMessages => [...prevMessages, imageMessage]);

        const formData = new FormData();
        formData.append('image', file);

        try {
            await axios.post(`http://localhost:5000/api/chats/upload-image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const systemImageResponseMessage = {
                _id: Date.now(),
                chatId: sessionId,
                user: 'System',
                message: 'Image uploaded successfully!',
                messageType: 'system',
            };

            setMessages(prevMessages => [...prevMessages, systemImageResponseMessage]);

            await axios.post(`http://localhost:5000/api/chats/`, systemImageResponseMessage);
        } catch (err) {
            console.error('Failed to post image or system response:', err);
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
                            ) : msg.messageType === 'image' ? (
                                <div className="image-message">
                                    <img
                                        src={`http://localhost:5000/uploads/${msg.file.fileName}`}
                                        alt={msg.file.fileName}
                                        style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'cover' }}
                                    />
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
                <ImageUpload onImageUploaded={handleImageUploaded} />
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
