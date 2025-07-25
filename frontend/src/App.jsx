import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Card, message, Select, Divider, Form } from 'antd';
import axios from 'axios';
import RadarChart from './components/RadarChart';
import Sidebar from './components/Sidebar';
import QuestionList from './components/QuestionList';
import { UserOutlined } from '@ant-design/icons';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState('records'); // 'records' or 'questions'
  const [showRegister, setShowRegister] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const mainContentRef = useRef(null);
  const [mainContentHeight, setMainContentHeight] = useState(0);
  // 个人信息页美化，支持头像上传
  const [avatarUrl, setAvatarUrl] = useState(null);
  const handleAvatarChange = e => {
    const file = e.target.files[0];
    if (file && (file.type === 'image/2png' || file.type === 'image/jpeg')) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
    } else {
      message.error('请上传PNG或JPG格式的图片');
    }
  };
  const [interviewRecords, setInterviewRecords] = useState([]);
  // 面试流程相关
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewFinished, setInterviewFinished] = useState(false);

  useEffect(() => {
    if (loggedIn) {
      axios.get('/api/positions', {
        headers: { Authorization: localStorage.getItem('token') }
      }).then(res => {
        console.log('positions接口返回数据:', res.data);
        if (res.data && Array.isArray(res.data.positions)) {
          setPositions(res.data.positions);
        } else {
          console.log('positions数据格式不正确:', res.data);
        }
      }).catch(err => {
        console.error('positions接口请求失败:', err);
      });
    }
  }, [loggedIn]);

  // 侧边栏tab切换函数，防止未定义报错
  function handleTabChange(tab) {
    if (tab === 'profile') return; // 个人信息只通过顶部小人图标进入
    setShowProfile(false);
    setActiveTab(tab);
  }
  function handleAdminTabChange(tab) {
    setAdminTab(tab);
  }

  // 获取面试记录
  useEffect(() => {
    if (loggedIn && activeTab === 'record') {
      axios.get('/api/interview_records', {
        headers: { Authorization: localStorage.getItem('token') }
      }).then(res => {
        if (res.data.success) setInterviewRecords(res.data.records || []);
      });
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

  // 动态获取右侧主内容区高度
  useEffect(() => {
    function updateHeight() {
      if (mainContentRef.current) {
        setMainContentHeight(mainContentRef.current.offsetHeight);
      }
    }
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [loggedIn, showProfile, activeTab]);

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

  // 注册逻辑
  const onRegister = async (values) => {
    try {
      const res = await axios.post('/api/register', values);
      if (res.data.success) {
        message.success('注册成功，请登录');
        setShowRegister(false);
      } else {
        message.error(res.data.msg || '注册失败');
      }
    } catch (e) {
      message.error('注册失败，请检查网络或重试');
    }
  };

  // 登录逻辑
  const onLogin = async (values) => {
    setLoginLoading(true);
    try {
      const res = await axios.post('/api/login', values);
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setLoggedIn(true);
        // 后端返回is_admin字段
        setIsAdmin(!!res.data.is_admin);
        message.success('登录成功，欢迎回来！');
      } else {
        message.error(res.data.msg || '登录失败');
      }
    } catch (e) {
      message.error('登录失败，请检查用户名和密码');
    }
    setLoginLoading(false);
  };

  // 登出逻辑
  const handleLogout = () => {
    localStorage.removeItem('token');
    setLoggedIn(false);
    setIsAdmin(false);
    message.success('已登出');
  };

  // 开始面试，获取AI题目（3个）
  const handleStartInterview = async () => {
    if (!position) {
      message.warning('请先选择岗位');
      return;
    }
    setInterviewLoading(true);
    try {
      const res = await axios.post('/api/ai_questions', { position }, { headers: { Authorization: localStorage.getItem('token') } });
      if (res.data.success && Array.isArray(res.data.questions) && res.data.questions.length > 0) {
        setAiQuestions(res.data.questions);
        setInterviewStarted(true);
        setCurrentQuestionIdx(0);
        setUserAnswers([]);
        setInterviewFinished(false);
        setSessionId(res.data.session_id); // 新增保存session_id
      } else {
        message.error(res.data.msg || '获取题目失败');
      }
    } catch {
      message.error('获取题目失败');
    }
    setInterviewLoading(false);
  };

  // 提交当前题目答案，获取下一个题目或结束
  const handleNextQuestion = async () => {
    const answerText = text;
    const currentQ = aiQuestions[currentQuestionIdx];
    console.log('handleNextQuestion', {
      sessionId,
      currentQuestionIdx,
      aiQuestions,
      question: currentQ,
      answer: answerText
    });
    if (!answerText && !audio) {
      message.warning('请作答后再提交');
      return;
    }
    if (!sessionId || !currentQ) {
      message.error('会话异常，请刷新页面重试');
      return;
    }
    let audioFile = audio;
    let audioUrlLocal = audioUrl;
    const newAnswers = [...userAnswers, { text: answerText, audio: audioFile, audioUrl: audioUrlLocal }];
    setUserAnswers(newAnswers);
    setText('');
    setAudio(null);
    setAudioUrl(null);
    setRecording(false);
    setInterviewLoading(true);
    try {
      const res = await axios.post('/api/ai_next_question', {
        session_id: sessionId,
        question: currentQ,
        answer: answerText
      }, { headers: { Authorization: localStorage.getItem('token') } });
      if (res.data.success && Array.isArray(res.data.questions) && res.data.questions.length > 0) {
        setAiQuestions(prev => [...prev, ...res.data.questions]);
        setCurrentQuestionIdx(idx => idx + 1);
      } else {
        setInterviewFinished(true);
        setInterviewStarted(false);
        message.success('面试已完成，结果已保存');
      }
    } catch (e) {
      message.error('获取新题目失败');
      console.error('handleNextQuestion error', e);
    }
    setInterviewLoading(false);
  };

  // 新增：sessionId状态
  const [sessionId, setSessionId] = useState(null);

  // 顶部横栏内容根据页面动态变化
  const getTopBarTitle = () => {
    if (!loggedIn) return showRegister ? '注册新账号' : '欢迎登录';
    if (showProfile) return '个人信息';
    if (isAdmin) {
      if (adminTab === 'records') return '管理员：所有用户测评记录';
      if (adminTab === 'questions') return '管理员：题库管理';
      return '管理员页面';
    }
    return '模态智能模拟面试评测智能体';
  };

  // 顶部横栏
  const TopBar = () => (
    <div style={{
      width: '100%',
      height: 56,
      background: '#1976d2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 100,
      boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.06)'
    }}>
      <div style={{ position: 'absolute', left: 24, display: 'flex', alignItems: 'center' }}>
        {loggedIn && (
          <Button
            type="text"
            icon={<UserOutlined style={{ fontSize: 22, color: '#fff' }} />}
            style={{ marginRight: 8, background: 'none', border: 'none' }}
            onClick={() => setShowProfile(true)}
          />
        )}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: 2 }}>
        {getTopBarTitle()}
      </div>
      <div style={{ position: 'absolute', right: 24 }}>
        {loggedIn && (
          <Button onClick={handleLogout} style={{ borderRadius: 4, background: '#fff', color: '#1976d2', border: 'none', fontWeight: 500 }}>登出</Button>
        )}
      </div>
    </div>
  );

  // 左侧竖栏样式（无圆角、无渐变，紧贴左侧）
  const sidebarStyle = {
    width: 64,
    minWidth: 64,
    background: '#f0f2f5',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '1px 0 8px 0 rgba(25, 118, 210, 0.04)',
    marginRight: 0,
    padding: '16px 0',
    borderRight: '1px solid #e0e0e0',
  };

  // 页面主体内容渲染
  let mainContent = null;
  if (!loggedIn) {
    mainContent = (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 56px)' }}>
        {showRegister ? (
          <Card style={loginCardStyle} bordered={false}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1976d2', marginBottom: 8 }}>注册新账号</div>
              <div style={{ color: '#1976d2', fontSize: 16, opacity: 0.7 }}>开启你的智能模拟面试之旅</div>
            </div>
            <Form layout="vertical" onFinish={onRegister} autoComplete="off">
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input style={inputStyle} size="large" allowClear />
              </Form.Item>
              <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
                <Input style={inputStyle} size="large" allowClear />
              </Form.Item>
              <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
                <Input style={inputStyle} size="large" allowClear />
              </Form.Item>
              <Form.Item name="school" label="学校" rules={[{ required: true, message: '请输入学校' }]}>
                <Input style={inputStyle} size="large" allowClear />
              </Form.Item>
              <Form.Item name="grade" label="年级" rules={[{ required: true, message: '请输入年级' }]}>
                <Input style={inputStyle} size="large" allowClear />
              </Form.Item>
              <Form.Item name="target_position" label="目标岗位" rules={[{ required: true, message: '请输入目标岗位' }]}>
                <Input style={inputStyle} size="large" allowClear />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true, min: 6, message: '密码至少6位' }]}>
                <Input.Password style={inputStyle} size="large" allowClear />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" style={loginBtnStyle} size="large">注册</Button>
              </Form.Item>
            </Form>
            <div style={{ textAlign: 'center', marginTop: 18 }}>
              已有账号？<a style={{ color: '#1976d2', cursor: 'pointer' }} onClick={() => setShowRegister(false)}>去登录</a>
            </div>
          </Card>
        ) : (
          <Card style={loginCardStyle} bordered={false}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1976d2', marginBottom: 8 }}>欢迎登录</div>
              <div style={{ color: '#1976d2', fontSize: 16, opacity: 0.7 }}>开启你的智能模拟面试之旅</div>
            </div>
            <Form layout="vertical" onFinish={onLogin} autoComplete="off">
              <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入邮箱' }]} style={{ marginBottom: 18 }}>
                <Input placeholder="邮箱" style={inputStyle} size="large" autoFocus allowClear />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]} style={{ marginBottom: 18 }}>
                <Input.Password placeholder="密码" style={inputStyle} size="large" allowClear />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={loginLoading} style={loginBtnStyle} size="large">登录</Button>
              </Form.Item>
            </Form>
            <div style={{ textAlign: 'center', marginTop: 18 }}>
              没有账号？<a style={{ color: '#1976d2', cursor: 'pointer' }} onClick={() => setShowRegister(true)}>去注册</a>
            </div>
        </Card>
      )}
      </div>
    );
  } else if (showProfile) {
    const userInfo = {
      name: '测试用户',
      email: 'test@example.com',
      phone: '18888888888',
      school: '测试大学',
      grade: '大三',
      target_position: '前端开发',
      is_admin: isAdmin
    };
    mainContent = (
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 56px)' }}>
        <div style={{ maxWidth: 700, width: '100%', background: '#fff', boxShadow: '0 2px 12px 0 rgba(0, 80, 180, 0.08)', padding: 32, position: 'relative', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 32 }}>
          <Button onClick={() => setShowProfile(false)} style={{ position: 'absolute', top: 24, right: 32, borderRadius: 4, background: '#f0f2f5', color: '#1976d2', border: 'none', fontWeight: 500 }}>返回</Button>
          {/* 左侧头像区 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 160 }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#e3f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, color: '#1976d2', marginBottom: 16, overflow: 'hidden', position: 'relative' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                userInfo.name ? userInfo.name[0] : 'U'
              )}
              <label htmlFor="avatar-upload" style={{ position: 'absolute', bottom: 0, right: 0, background: '#1976d2', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, border: '2px solid #fff' }} title="更换头像">
                <span role="img" aria-label="upload">⬆️</span>
                <input id="avatar-upload" type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </label>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1976d2', marginBottom: 4 }}>{userInfo.name}</div>
            <div style={{ color: '#888', fontSize: 15 }}>{userInfo.is_admin ? '管理员' : '普通用户'}</div>
          </div>
          {/* 右侧信息区 */}
          <div style={{ flex: 1, borderLeft: '1px solid #f0f0f0', paddingLeft: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div><b>邮箱：</b>{userInfo.email}</div>
            <div><b>手机号：</b>{userInfo.phone}</div>
            <div><b>学校：</b>{userInfo.school}</div>
            <div><b>年级：</b>{userInfo.grade}</div>
            <div><b>目标岗位：</b>{userInfo.target_position}</div>
          </div>
        </div>
      </div>
    );
  } else if (loggedIn && isAdmin) {
    // 管理员页面tab切换
    mainContent = (
      <div style={{ width: '100%', display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <div style={sidebarStyle}>
          <Sidebar active={adminTab} onChange={handleAdminTabChange} />
        </div>
        <div style={{ flex: 1, padding: 32 }}>
          {adminTab === 'records' && (
            <div>
              <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 16 }}>测评记录</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.06)' }}>
                <thead style={{ background: '#e3f0ff' }}>
                  <tr>
                    <th style={{ padding: 10 }}>用户</th>
                    <th style={{ padding: 10 }}>岗位</th>
                    <th style={{ padding: 10 }}>时间</th>
                    <th style={{ padding: 10 }}>结果</th>
                    <th style={{ padding: 10 }}>分数</th>
                  </tr>
                </thead>
                <tbody>
                  {/* mockRecords is not defined here, this will cause an error */}
                  {/* {mockRecords.map((r, i) => ( */}
                  {/*   <tr key={i} style={{ textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}> */}
                  {/*     <td style={{ padding: 10 }}>{r.user}</td> */}
                  {/*     <td style={{ padding: 10 }}>{r.position}</td> */}
                  {/*     <td style={{ padding: 10 }}>{r.time}</td> */}
                  {/*     <td style={{ padding: 10 }}>{r.result}</td> */}
                  {/*     <td style={{ padding: 10 }}>{r.score}</td> */}
                  {/*   </tr> */}
                  {/* ))} */}
                </tbody>
              </table>
            </div>
          )}
          {adminTab === 'questions' && (
            <div>
              <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 16 }}>题库列表</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.06)' }}>
                <thead style={{ background: '#e3f0ff' }}>
                  <tr>
                    <th style={{ padding: 10 }}>ID</th>
                    <th style={{ padding: 10 }}>岗位</th>
                    <th style={{ padding: 10 }}>题目内容</th>
                  </tr>
                </thead>
                <tbody>
                  {/* mockQuestions is not defined here, this will cause an error */}
                  {/* {mockQuestions.map((q, i) => ( */}
                  {/*   <tr key={i} style={{ textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}> */}
                  {/*     <td style={{ padding: 10 }}>{q.id}</td> */}
                  {/*     <td style={{ padding: 10 }}>{q.position}</td> */}
                  {/*     <td style={{ padding: 10 }}>{q.content}</td> */}
                  {/*   </tr> */}
                  {/* ))} */}
                </tbody>
              </table>
              <div style={{ marginTop: 24, color: '#888' }}>
                （题库管理功能后续完善）
              </div>
            </div>
          )}
          {adminTab === 'doc' && (
            <div>
              <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 16 }}>文档中心</div>
              <div style={{ color: '#888' }}>
                文档中心功能待完善，将展示所有面试相关的文档和资料。
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    // 普通用户页面tab切换
    mainContent = (
      <div style={{ width: '100%', display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <div style={sidebarStyle}>
          <Sidebar active={isAdmin ? adminTab : activeTab} onChange={isAdmin ? handleAdminTabChange : handleTabChange} />
        </div>
        <div style={{ flex: 1, display: 'flex', height: '100%' }}>
          {/* 问题区 30% 仅在interview时显示 */}
          {activeTab === 'interview' && (
            <div style={{ width: '30%', minWidth: 220, maxWidth: 480, height: '100%', background: '#fff', boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.04)', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
              {/* 岗位选择和开始面试按钮 */}
              <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Select
                  style={{ flex: 1 }}
                  placeholder="请选择面试岗位/领域"
                  value={position}
                  onChange={setPosition}
                  options={positions.map(p => ({ label: p, value: p }))}
                  disabled={interviewStarted}
                />
                <Button type="primary" onClick={handleStartInterview} loading={interviewLoading} disabled={interviewStarted}>
                  开始面试
                </Button>
              </div>
              {/* 面试题目流程 */}
              {interviewStarted && aiQuestions.length > 0 && !interviewFinished ? (
                <div style={{ padding: 24, fontSize: 18, fontWeight: 600, color: '#1976d2', minHeight: 120 }}>
                  第{currentQuestionIdx+1}题：{aiQuestions[currentQuestionIdx]}
                </div>
              ) : !interviewStarted ? (
                <div style={{ padding: 24, color: '#888', minHeight: 120 }}>请点击“开始面试”获取AI题目</div>
              ) : interviewFinished ? (
                <div style={{ padding: 24, color: '#52c41a', minHeight: 120 }}>面试已完成，评测结果已保存</div>
              ) : null}
            </div>
          )}
          {/* 右侧主内容区 70% */}
          <div style={{ width: activeTab === 'interview' ? '70%' : '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'interview' && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* 视频+录音区域分上下两块，flex:1各占一半，切tab不依赖高度计算 */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ flex: 1, minHeight: 100, background: '#f0f2f5', borderRadius: 0, marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <video ref={videoRef} autoPlay muted style={{ width: '100%', height: '100%', maxHeight: '100%', borderRadius: 0, objectFit: 'cover', background: '#e0e0e0', aspectRatio: '4 / 3' }} />
                  </div>
                  <div style={{ flex: 1, minHeight: 100, background: '#fff', borderRadius: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.06)', padding: 8 }}>
                    <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 4 }}>语音作答</div>
                    <div>
                      {!recording ? (
                        <Button style={recordBtnStyle} onClick={startRecording} icon={<span role="img" aria-label="mic">🎤</span>} disabled={!interviewStarted || interviewFinished} />
                      ) : (
                        <Button style={{ ...recordBtnStyle, background: 'linear-gradient(90deg, #f44336 0%, #ff9800 100%)' }} onClick={stopRecording} icon={<span role="img" aria-label="stop">⏹️</span>} disabled={!interviewStarted || interviewFinished} />
                      )}
                    </div>
                    <Input.TextArea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="请输入你的面试回答文本（可选）"
                      rows={3}
                      style={{ margin: '16px 0', borderRadius: 6, background: '#f7fbff', border: '1px solid #b3d8ff', width: 320 }}
                      disabled={!interviewStarted || interviewFinished}
                    />
                    <Button type="primary" onClick={handleNextQuestion} loading={interviewLoading} style={{ borderRadius: 4, background: '#1976d2', border: 'none', fontWeight: 600, fontSize: 14, marginTop: 4 }} disabled={!interviewStarted || interviewFinished}>
                      {currentQuestionIdx < 9 ? '提交本题，下一题' : '提交并完成面试'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'record' && (
              <div style={{ flex: 1, background: '#f4f8fd', padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: interviewRecords.length === 0 ? 'center' : 'flex-start' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1976d2', marginBottom: 24 }}>我的面试记录</div>
                {interviewRecords.length === 0 ? (
                  <div style={{ color: '#888', fontSize: 20, textAlign: 'center' }}>面试记录为空</div>
                ) : (
                  interviewRecords.map((rec, idx) => {
                    let result = {};
                    let suggestions = [];
                    try {
                      result = JSON.parse(rec.result || '{}');
                      suggestions = result.suggestions || [];
                    } catch {}
                    return (
                      <div key={rec.id || idx} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.06)', marginBottom: 24, padding: 24 }}>
                        <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 8 }}>{rec.position} | {rec.created_at ? rec.created_at.split('T')[0] : ''}</div>
                        {result.abilities && (
                          <div style={{ marginBottom: 8 }}>
                            {Object.entries(result.abilities).map(([k, v]) => (
                              <span key={k} style={{ marginRight: 18 }}>{k}: <b>{v}</b></span>
                            ))}
                          </div>
                        )}
                        {suggestions.length > 0 && (
                          <div style={{ color: '#888', fontSize: 14, marginTop: 8 }}>
                            <b>建议：</b>{suggestions.join('；')}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
            {activeTab === 'doc' && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#1976d2', fontWeight: 600, background: '#fff' }}>
                文档中心（mock）
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 页面统一布局：顶部横栏+主体内容
  return (
    <div style={{ minHeight: '100vh', background: '#f4f8fd', paddingTop: 56 }}>
      <TopBar />
      {mainContent}
    </div>
  );
}

export default App; 