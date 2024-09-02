import React, { useRef, useState } from 'react';
import axios from 'axios';

const FileUpload = ({ onFileUploaded }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSelectedFile(file);
    };

    const handleFileUpload = () => {
        if (!selectedFile) {
            alert('Please select a file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        axios.post('http://localhost:5000/api/files/upload', formData)
            .then(response => {
                console.log('File uploaded successfully:', response.data.file);
                setUploadedFile(response.data.file);
                setSelectedFile(null);
                setPreviewVisible(false);
                onFileUploaded(response.data.file); // Notify parent component about the upload
            })
            .catch(err => {
                console.error('File upload failed:', err);
                alert('File upload failed. Check console for details.');
            });
    };

    const handleIconClick = () => {
        fileInputRef.current.click();
    };

    const handlePreviewClick = () => {
        setPreviewVisible(prev => !prev);
    };

    const previewUrl = selectedFile ? URL.createObjectURL(selectedFile) : '';

    return (
        <div className="file-upload">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <div className="upload-icon" onClick={handleIconClick}>
                📎
            </div>

            {selectedFile && (
                <div className="selected-file-info">
                    <h4>Selected File: {selectedFile.name}</h4>
                    <div className="file-icon" onClick={handlePreviewClick} style={{ display: 'inline-block', cursor: 'pointer' }}>
                        {selectedFile.name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img
                                src={previewUrl}
                                alt={selectedFile.name}
                                style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                            />
                        ) : (
                            <div className="generic-icon" style={{ fontSize: '24px' }}>📄</div>
                        )}
                    </div>
                    <button onClick={handleFileUpload}>Upload</button>
                </div>
            )}

            {uploadedFile && (
                <div className="uploaded-file">
                    <h4>Uploaded File:</h4>
                    <div className="file-icon" onClick={handlePreviewClick} style={{ cursor: 'pointer' }}>
                        {uploadedFile.fileName.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img
                                src={`http://localhost:5000/uploads/${uploadedFile.fileName}`}
                                alt={uploadedFile.originalName}
                                style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                            />
                        ) : (
                            <div className="generic-icon" style={{ fontSize: '24px' }}>📄</div>
                        )}
                    </div>

                    {previewVisible && (
                        <div className="file-preview">
                            {uploadedFile.fileName.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                <img
                                    src={`http://localhost:5000/uploads/${uploadedFile.fileName}`}
                                    alt={uploadedFile.originalName}
                                    style={{ maxWidth: '100%', maxHeight: '400px' }}
                                />
                            ) : uploadedFile.fileName.match(/\.pdf$/i) ? (
                                <embed
                                    src={`http://localhost:5000/uploads/${uploadedFile.fileName}`}
                                    type="application/pdf"
                                    width="100%"
                                    height="600px"
                                />
                            ) : (
                                <p>Preview not available for this file type.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileUpload;
