import React, { useState } from 'react';
import { Button, message } from 'antd';
import FileUpload from './FileUpload';

const FileUploadTest = () => {
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleFileSelect = (file) => {
    console.log('File selected:', file);
    setUploadedFile(file);
    message.success(`文件已选择: ${file.name}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h3>文件上传测试</h3>
      <FileUpload
        accept=".md,.txt"
        onFileSelect={handleFileSelect}
        buttonText="选择文件"
      />
      {uploadedFile && (
        <div style={{ marginTop: 10 }}>
          <p>已选择文件: {uploadedFile.name}</p>
          <p>文件大小: {uploadedFile.size} bytes</p>
          <p>文件类型: {uploadedFile.type}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploadTest; 