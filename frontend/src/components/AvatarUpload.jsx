import React, { useRef } from 'react';

const AvatarUpload = ({ 
  onFileSelect, 
  disabled = false,
  children 
}) => {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    if (fileInputRef.current && !disabled) {
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
    <div onClick={handleClick} style={{ cursor: disabled ? 'default' : 'pointer' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {children}
    </div>
  );
};

export default AvatarUpload; 