import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Card, message, Select, Divider, Form } from 'antd';
import axios from 'axios';
import RadarChart from './components/RadarChart';
import Sidebar from './components/Sidebar';
import QuestionList from './components/QuestionList';

const loginCardStyle = {
  maxWidth: 350,
  margin: '120px auto',
  borderRadius: 18,
  boxShadow: '0 4px 24px 0 rgba(0, 80, 180, 0.10)',
  background: 'linear-gradient(135deg, #e3f0ff 0%, #b3d8ff 100%)',
  border: 'none',
};
const loginBtnStyle = {
  width: '100%',
  borderRadius: 12,
  background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
  border: 'none',
  color: '#fff',
  fontWeight: 600,
  fontSize: 16,
  boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.10)'
};
const inputStyle = {
  borderRadius: 10,
  border: '1px solid #b3d8ff',
  background: '#f7fbff',
};

const mainAreaStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0
};
const videoBoxStyle = {
  width: '100%',
  aspectRatio: '4 / 3',
  background: '#e3f0ff',
  borderRadius: 16,
  marginBottom: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.08)'
};
const recordBoxStyle = {
  width: '100%',
  minHeight: 90,
  background: '#f7fbff',
  borderRadius: 16,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.06)',
  padding: 16
};
const recordBtnStyle = {
  width: 56,
  height: 56,
  borderRadius: '50%',
  background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
  border: 'none',
  color: '#fff',
  fontSize: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.10)',
  marginBottom: 8
};

function App() {
  const [positions, setPositions] = useState([]);
  const [position, setPosition] = useState('');
  const [questions, setQuestions] = useState([]);
  const [audio, setAudio] = useState(null);
  const [video, setVideo] = useState(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [learningPath, setLearningPath] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));
  const [loginLoading, setLoginLoading] = useState(false);
  // 录音相关
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioChunks = useRef([]);
  // 视频相关
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  // 页面切换
  const [activeTab, setActiveTab] = useState('interview');

  useEffect(() => {
    if (loggedIn && activeTab === 'interview') {
      axios.get('/api/positions').then(res => setPositions(res.data));
    }
  }, [loggedIn, activeTab]);

  useEffect(() => {
    if (position && activeTab === 'interview') {
      axios.get('/api/questions', { params: { position } }).then(res => setQuestions(res.data));
      axios.get('/api/learning_path', { params: { position } }).then(res => setLearningPath(res.data.resources));
    } else {
      setQuestions([]);
      setLearningPath([]);
    }
  }, [position, activeTab]);

  // 视频采集
  useEffect(() => {
    if (videoRef.current && activeTab === 'interview') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(s => {
          setStream(s);
          videoRef.current.srcObject = s;
        })
        .catch(() => {
          setStream(null);
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line
  }, [videoRef, activeTab]);

  // 录音逻辑
  const startRecording = async () => {
    if (!navigator.mediaDevices) {
      message.error('当前浏览器不支持录音');
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new window.MediaRecorder(stream);
    audioChunks.current = [];
    recorder.ondataavailable = e => {
      audioChunks.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
      setAudio(new File([blob], 'record.webm'));
      setAudioUrl(URL.createObjectURL(blob));
    };
    setMediaRecorder(recorder);
    setRecording(true);
    recorder.start();
  };
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const handleSubmit = async () => {
    if (!audio) {
      message.error('请先录音');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('audio', audio);
    formData.append('text', text);
    formData.append('position', position);
    if (video) formData.append('video', video);
    try {
      const res = await axios.post('/api/interview', formData);
      setResult(res.data);
    } catch (e) {
      message.error('评测失败');
    }
    setUploading(false);
  };

  // 登录逻辑
  const onLogin = async (values) => {
    setLoginLoading(true);
    try {
      const res = await axios.post('/api/login', values);
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setLoggedIn(true);
        message.success('登录成功，欢迎回来！');
      } else {
        message.error(res.data.msg || '登录失败');
      }
    } catch (e) {
      message.error('登录失败，请检查用户名和密码');
    }
    setLoginLoading(false);
  };

  if (!loggedIn) {
    return (
      <Card style={loginCardStyle} bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1976d2', marginBottom: 8 }}>欢迎登录</div>
          <div style={{ color: '#1976d2', fontSize: 16, opacity: 0.7 }}>开启你的智能模拟面试之旅</div>
        </div>
        <Form layout="vertical" onFinish={onLogin} autoComplete="off">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}
            style={{ marginBottom: 18 }}>
            <Input placeholder="用户名" style={inputStyle} size="large" autoFocus allowClear />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}
            style={{ marginBottom: 18 }}>
            <Input.Password placeholder="密码" style={inputStyle} size="large" allowClear />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loginLoading} style={loginBtnStyle} size="large">
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    );
  }

  // mock页面内容
  if (activeTab === 'profile') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f8fd', padding: 32 }}>
        <Sidebar active={activeTab} onChange={setActiveTab} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#1976d2', fontWeight: 600, borderRadius: 18, background: '#fff', boxShadow: '0 2px 12px 0 rgba(0, 80, 180, 0.08)' }}>
          个人信息（mock）
        </div>
      </div>
    );
  }
  if (activeTab === 'record') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f8fd', padding: 32 }}>
        <Sidebar active={activeTab} onChange={setActiveTab} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#1976d2', fontWeight: 600, borderRadius: 18, background: '#fff', boxShadow: '0 2px 12px 0 rgba(0, 80, 180, 0.08)' }}>
          面试记录（mock）
        </div>
      </div>
    );
  }
  if (activeTab === 'doc') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f8fd', padding: 32 }}>
        <Sidebar active={activeTab} onChange={setActiveTab} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#1976d2', fontWeight: 600, borderRadius: 18, background: '#fff', boxShadow: '0 2px 12px 0 rgba(0, 80, 180, 0.08)' }}>
          文档中心（mock）
        </div>
      </div>
    );
  }

  // 主面试页面
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f8fd', padding: 32 }}>
      <Sidebar active={activeTab} onChange={setActiveTab} />
      <QuestionList questions={questions} />
      <div style={mainAreaStyle}>
        {/* 视频区域 */}
        <div style={videoBoxStyle}>
          <video ref={videoRef} autoPlay muted style={{ width: '100%', height: '100%', borderRadius: 16, objectFit: 'cover', background: '#b3d8ff', aspectRatio: '4 / 3' }} />
        </div>
        {/* 录音区域 */}
        <div style={recordBoxStyle}>
          <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 8 }}>语音作答</div>
          <div>
            {!recording ? (
              <Button style={recordBtnStyle} onClick={startRecording} icon={<span role="img" aria-label="mic">🎤</span>} />
            ) : (
              <Button style={{ ...recordBtnStyle, background: 'linear-gradient(90deg, #f44336 0%, #ff9800 100%)' }} onClick={stopRecording} icon={<span role="img" aria-label="stop">⏹️</span>} />
            )}
          </div>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>{recording ? '录音中...' : '点击录音，完成后再次点击停止'}</div>
          {audioUrl && (
            <audio src={audioUrl} controls style={{ marginBottom: 8, width: 180, borderRadius: 8 }} />
          )}
          <Button type="primary" onClick={handleSubmit} loading={uploading} style={{ borderRadius: 12, background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)', border: 'none', fontWeight: 600, fontSize: 16, marginTop: 8 }}>
            提交评测
          </Button>
        </div>
        {/* 评测结果已隐藏，后续可再设计 */}
      </div>
    </div>
  );
}

export default App; 