import React, { useRef } from 'react';
import { Button, message } from 'antd';

const FileUpload = ({ 
  accept, 
  onFileSelect, 
  buttonText, 
  disabled = false,
  loading = false 
}) => {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      onFileSelect(file);
      // 清空input，允许重复选择同一文件
      event.target.value = '';
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <Button
        type="dashed"
        style={{ width: '100%', height: 40 }}
        disabled={disabled}
        loading={loading}
        onClick={handleClick}
      >
        {buttonText}
      </Button>
    </div>
  );
};

export default FileUpload; 