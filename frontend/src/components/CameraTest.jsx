import React, { useState, useEffect, useRef } from 'react';
import { Button, message, Card, Space, Modal } from 'antd';

const CameraTest = ({ onClose }) => {
  const [stream, setStream] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const addTestResult = (type, success, message) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      type,
      success,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const testCameraAccess = async () => {
    setIsLoading(true);
    addTestResult('权限检查', 'info', '开始检查摄像头权限...');

    try {
      // 检查浏览器支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addTestResult('浏览器支持', false, '浏览器不支持摄像头访问');
        return;
      }
      addTestResult('浏览器支持', true, '浏览器支持摄像头访问');

      // 请求摄像头权限
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      addTestResult('权限获取', true, '成功获取摄像头权限');
      addTestResult('流创建', true, '成功创建媒体流');

    } catch (error) {
      console.error('摄像头测试失败:', error);
      
      let errorMessage = '未知错误';
      if (error.name === 'NotAllowedError') {
        errorMessage = '摄像头权限被拒绝，请允许浏览器访问摄像头';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '未找到摄像头设备';
      } else if (error.name === 'NotReadableError') {
        errorMessage = '摄像头被其他应用占用';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = '摄像头不支持请求的配置';
      } else {
        errorMessage = error.message;
      }

      addTestResult('权限获取', false, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const testVideoPlayback = () => {
    if (!videoRef.current) {
      addTestResult('视频播放', false, '视频元素不存在');
      return;
    }

    const video = videoRef.current;
    
    if (video.readyState >= 2) {
      addTestResult('视频播放', true, `视频已准备就绪，尺寸: ${video.videoWidth}x${video.videoHeight}`);
    } else {
      addTestResult('视频播放', false, `视频未准备就绪，状态: ${video.readyState}`);
    }
  };

  const testPhotoCapture = () => {
    if (!videoRef.current || !canvasRef.current) {
      addTestResult('拍照功能', false, '视频或Canvas元素不存在');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState < 2) {
      addTestResult('拍照功能', false, '视频未准备就绪，无法拍照');
      return;
    }

    try {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      addTestResult('拍照功能', true, `拍照成功，图片大小: ${Math.round(imageData.length / 1024)}KB`);
    } catch (error) {
      addTestResult('拍照功能', false, `拍照失败: ${error.message}`);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      addTestResult('停止摄像头', true, '摄像头已停止');
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const handleClose = () => {
    stopCamera();
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <Modal
      title="摄像头测试工具"
      open={true}
      onCancel={handleClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 控制按钮 */}
        <Space>
          <Button 
            type="primary" 
            onClick={testCameraAccess} 
            loading={isLoading}
            disabled={!!stream}
          >
            启动摄像头
          </Button>
          <Button 
            onClick={testVideoPlayback} 
            disabled={!stream}
          >
            测试视频播放
          </Button>
          <Button 
            onClick={testPhotoCapture} 
            disabled={!stream}
          >
            测试拍照
          </Button>
          <Button 
            danger 
            onClick={stopCamera} 
            disabled={!stream}
          >
            停止摄像头
          </Button>
          <Button onClick={clearResults}>
            清空结果
          </Button>
        </Space>

        {/* 视频预览 */}
        {stream && (
          <div style={{ textAlign: 'center' }}>
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              style={{ 
                width: '100%', 
                maxWidth: 400, 
                borderRadius: 8,
                border: '2px solid #52c41a'
              }} 
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {/* 测试结果 */}
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          <h4>测试结果:</h4>
          {testResults.length === 0 ? (
            <p style={{ color: '#888' }}>暂无测试结果</p>
          ) : (
            testResults.map(result => (
              <div 
                key={result.id} 
                style={{ 
                  padding: '8px 12px', 
                  margin: '4px 0', 
                  borderRadius: 4,
                  background: result.success === true ? '#f6ffed' : 
                             result.success === false ? '#fff2f0' : '#f0f9ff',
                  border: `1px solid ${
                    result.success === true ? '#b7eb8f' : 
                    result.success === false ? '#ffccc7' : '#91d5ff'
                  }`
                }}
              >
                <div style={{ 
                  fontWeight: 500, 
                  color: result.success === true ? '#52c41a' : 
                         result.success === false ? '#ff4d4f' : '#1890ff'
                }}>
                  {result.type}
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {result.timestamp} - {result.message}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 使用说明 */}
        <Card size="small" title="使用说明" style={{ marginTop: 16 }}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>点击"启动摄像头"开始测试</li>
            <li>如果权限被拒绝，请检查浏览器设置</li>
            <li>确保没有其他应用占用摄像头</li>
            <li>测试完成后记得停止摄像头</li>
          </ul>
        </Card>
      </Space>
    </Modal>
  );
};

export default CameraTest; 