import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FaCamera } from 'react-icons/fa'; // Import camera icon
import './ImageUpload.css'; // Import CSS for styling

const ImageUpload = ({ onImageUploaded }) => {
    const [imgSrc, setImgSrc] = useState(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [uploadOption, setUploadOption] = useState(''); // Track the user's selection
    const webcamRef = useRef(null);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setImgSrc(imageSrc);
        setIsCameraOpen(false); // Close the camera after the photo is captured
    }, [webcamRef]);

    const retake = () => {
        setImgSrc(null);
        setIsCameraOpen(true); // Re-open the camera for retaking the photo
    };

    const handleUpload = () => {
        if (imgSrc) {
            const imageFile = {
                fileName: 'captured-image.png',
                fileType: 'image/png',
                originalName: 'captured-image.png',
                imageSrc: imgSrc,
            };
            onImageUploaded(imageFile);
            setImgSrc(null); // Reset after upload
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const fileReader = new FileReader();
            fileReader.onload = () => {
                const imageFile = {
                    fileName: file.name,
                    fileType: file.type,
                    originalName: file.name,
                    imageSrc: fileReader.result,
                };
                onImageUploaded(imageFile);
                setImgSrc(fileReader.result); // Display the uploaded file
            };
            fileReader.readAsDataURL(file);
        }
    };

    const handleCameraToggle = () => {
        setIsCameraOpen(!isCameraOpen); // Toggle camera on button click
    };

    const handleCloseCamera = () => {
        setIsCameraOpen(false); // Close the camera without taking a photo
    };

    const handleUploadOptionChange = (e) => {
        const selectedOption = e.target.value;
        setUploadOption(selectedOption);
        setImgSrc(null); // Reset any previously uploaded or captured image
        setIsCameraOpen(selectedOption === 'camera');
    };

    return (
        <div className="image-upload">
            <div className="upload-options">
                <label htmlFor="upload-option">Choose Upload Option: </label>
                <select id="upload-option" value={uploadOption} onChange={handleUploadOptionChange}>
                    <option value="">Select</option>
                    <option value="camera">Camera</option>
                    <option value="file">Upload from Files</option>
                </select>
            </div>

            {/* Conditional rendering based on user's upload option */}
            {uploadOption === 'camera' && !imgSrc && (
                <div className="webcam-container">
                    {isCameraOpen && (
                        <>
                            <Webcam
                                audio={false}
                                height={600}
                                width={600}
                                ref={webcamRef}
                                screenshotFormat="image/png"
                            />
                            <div className="btn-container">
                                <button onClick={capture}>Capture photo</button>
                                <button onClick={handleCloseCamera}>Close camera</button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {uploadOption === 'file' && !imgSrc && (
                <div className="file-upload-container">
                    <input type="file" accept="image/*" onChange={handleFileUpload} />
                </div>
            )}

            {imgSrc && (
                <div className="preview-container">
                    <img src={imgSrc} alt="Uploaded" style={{ width: '100%', height: 'auto' }} />
                    <div className="btn-container">
                        {uploadOption === 'camera' && <button onClick={retake}>Retake photo</button>}
                        <button onClick={handleUpload}>Upload photo</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
