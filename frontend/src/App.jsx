import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Card, message, Select, Divider, Form } from 'antd';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import RadarChart from './components/RadarChart';
import QuestionList from './components/QuestionList';
import FileUpload from './components/FileUpload';
import AvatarUpload from './components/AvatarUpload';
import MarkdownRenderer from './components/MarkdownRenderer';
import CameraTest from './components/CameraTest';
import AdminPanel from './components/AdminPanel';
import Editor from '@monaco-editor/react';
import { 
  UserOutlined, 
  VideoCameraOutlined, 
  HistoryOutlined, 
  FileTextOutlined, 
  SettingOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  BookOutlined,
  AimOutlined,
  LockOutlined,
  UserAddOutlined,
  LoginOutlined
} from '@ant-design/icons';



const loginCardStyle = {
  maxWidth: 420,
  margin: '80px auto',
  borderRadius: 24,
  boxShadow: '0 20px 60px 0 rgba(0, 0, 0, 0.15)',
  background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(10px)',
  position: 'relative',
  overflow: 'hidden',
};

const loginCardStyleWithBg = {
  ...loginCardStyle,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
};

const loginBtnStyle = {
  width: '100%',
  borderRadius: 16,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  border: 'none',
  color: '#fff',
  fontWeight: 600,
  fontSize: 16,
  height: 48,
  boxShadow: '0 8px 24px 0 rgba(102, 126, 234, 0.3)',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
};

const inputStyle = {
  borderRadius: 12,
  border: '2px solid #e8eaed',
  background: '#ffffff',
  height: 48,
  fontSize: 16,
  transition: 'all 0.3s ease',
  boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.05)',
};

const inputStyleFocused = {
  ...inputStyle,
  border: '2px solid #667eea',
  boxShadow: '0 4px 16px 0 rgba(102, 126, 234, 0.15)',
};

const loginContainerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  position: 'relative',
  overflow: 'hidden',
};

const floatingShapeStyle = {
  position: 'absolute',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.1)',
  animation: 'float 6s ease-in-out infinite',
};

const logoStyle = {
  fontSize: 32,
  fontWeight: 700,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  marginBottom: 8,
  textAlign: 'center',
};

const subtitleStyle = {
  color: '#6b7280',
  fontSize: 16,
  textAlign: 'center',
  marginBottom: 32,
  fontWeight: 400,
};

const mainAreaStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0
};
// 修改摄像头区域样式为中等尺寸
const videoBoxStyle = {
  width: 480 * 2,
  height: 360 * 2,
  background: '#e3f0ff',
  borderRadius: 16,
  margin: '24px auto',
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
  // const [learningPath, setLearningPath] = useState([]);
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
  const [showAdminPanel, setShowAdminPanel] = useState(false); // 是否显示管理员面板
  const [adminTab, setAdminTab] = useState('records'); // 'records' or 'questions'
  const [showRegister, setShowRegister] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const mainContentRef = useRef(null);
  const [mainContentHeight, setMainContentHeight] = useState(0);
  // 个人信息页美化，支持头像上传
  const [avatarUrl, setAvatarUrl] = useState(null);
  const handleAvatarChange = file => {
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
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
  // 新增：记录第几轮答题
  const [answerRound, setAnswerRound] = useState(0);
  // 新增：选中的面试记录
  const [selectedRecord, setSelectedRecord] = useState(null);
  // 新增：sessionId状态
  const [sessionId, setSessionId] = useState(null);
  // 新增：chatId状态
  const [chatId, setChatId] = useState(null);
  // 新增：拍照相关状态
  const [capturedImages, setCapturedImages] = useState([]);
  const canvasRef = useRef(null);
  // 新增：简历相关状态
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [resumeQuestions, setResumeQuestions] = useState([]);
  const [resumeLoading, setResumeLoading] = useState(false);
  // 新增：用户信息状态
  const [userInfo, setUserInfo] = useState(null);
  // 新增：摄像头测试状态
  const [showCameraTest, setShowCameraTest] = useState(false);
  // 新增：强制重新初始化摄像头的标志
  const [cameraRefreshFlag, setCameraRefreshFlag] = useState(0);
  // 新增：侧边栏收起状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // 新增：代码编辑器内容
  const [codeContent, setCodeContent] = useState(`// 在这里编写代码
function interviewCode() {
  console.log("面试代码示例");
}

// 支持多种编程语言
const result = "Hello Interview!";

// 算法示例
function bubbleSort(arr) {
  const len = arr.length;
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}

// 数据结构示例
class TreeNode {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}`);

  // 初始化用户信息
  const initializeUserInfo = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await axios.get('/api/user/info', {
        headers: { Authorization: token }
      });
      
      if (response.data.success) {
        setIsAdmin(!!response.data.user.is_admin);
        setUserInfo(response.data.user);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // 如果token无效，清除登录状态
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setLoggedIn(false);
        setIsAdmin(false);
      }
    }
  };

  // 新增：拍照函数
  const captureImage = () => {
    console.log('开始拍照...');
    
    if (!videoRef.current) {
      console.error('视频元素不存在');
      message.error('视频元素不存在');
      return null;
    }
    
    if (!canvasRef.current) {
      console.error('Canvas元素不存在');
      message.error('Canvas元素不存在');
      return null;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // 检查视频是否已经准备好
    if (video.readyState < 2) { // HAVE_CURRENT_DATA
      console.warn('视频还未准备好，当前状态:', video.readyState);
      message.warning('视频还未准备好，请稍后再试');
      return null;
    }
    
    // 检查视频是否有有效的尺寸
    if (!video.videoWidth || !video.videoHeight) {
      console.error('视频尺寸无效:', video.videoWidth, video.videoHeight);
      message.error('视频尺寸无效，无法拍照');
      return null;
    }
    
    try {
      const context = canvas.getContext('2d');
      
      // 设置canvas尺寸与视频一致
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log('Canvas尺寸设置为:', canvas.width, 'x', canvas.height);
      
      // 将视频帧绘制到canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 转换为base64图片数据
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      console.log('拍照成功，图片数据长度:', imageData.length);
      
      return imageData;
    } catch (error) {
      console.error('拍照过程中发生错误:', error);
      message.error('拍照失败: ' + error.message);
      return null;
    }
  };

  // 新增：随机拍照函数
  const captureRandomImages = () => {
    console.log('开始随机拍照，计划拍摄1张照片...');
    const images = [];
    let successCount = 0;
    
    for (let i = 0; i < 1; i++) {
      try {
        console.log(`拍摄第${i + 1}张照片...`);
        const imageData = captureImage();
        
        if (imageData) {
          // 将base64转换为文件对象
          const base64Data = imageData.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          
          for (let j = 0; j < byteCharacters.length; j++) {
            byteNumbers[j] = byteCharacters.charCodeAt(j);
          }
          
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/jpeg' });
          const file = new File([blob], `interview_image_${i + 1}.jpg`, { type: 'image/jpeg' });
          
          images.push(file);
          successCount++;
          console.log(`第${i + 1}张照片拍摄成功`);
        } else {
          console.warn(`第${i + 1}张照片拍摄失败`);
        }
      } catch (error) {
        console.error(`第${i + 1}张照片拍摄出错:`, error);
      }
    }
    
    console.log(`拍照完成，成功拍摄${successCount}张照片`);
    
    if (successCount === 0) {
      message.error('照片拍摄失败，请检查摄像头权限');
      return [];
    } else if (successCount < 1) {
      message.warning(`只拍摄到${successCount}张照片，可能影响分析效果`);
    } else {
      message.success('成功拍摄1张照片');
    }
    
    return images;
  };

  // 新增：简历上传函数
  const handleResumeUpload = async (file) => {
    console.log('handleResumeUpload called with file:', file);
    
    if (!file) {
      console.log('No file provided');
      return;
    }
    
    if (!file.name.toLowerCase().endsWith('.md')) {
      message.error('请上传Markdown格式的简历文件');
      return;
    }
    
    console.log('Starting resume upload for file:', file.name);
    setResumeLoading(true);
    const formData = new FormData();
    formData.append('resume', file);
    
    try {
      const res = await axios.post('/api/upload_resume', formData, {
        headers: { 
          Authorization: localStorage.getItem('token'),
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Upload response:', res.data);
      
      if (res.data.success) {
        setResumeFile(file);
        setResumeUploaded(true);
        message.success('简历上传成功');
        // 刷新用户信息
        fetchUserInfo();
      } else {
        message.error(res.data.msg || '简历上传失败');
      }
    } catch (e) {
      console.error('Resume upload error:', e);
      message.error('简历上传失败');
    }
    setResumeLoading(false);
  };

  // 新增：基于简历生成问题函数
  const handleGenerateQuestionsFromResume = async () => {
    if (!position) {
      message.warning('请先选择岗位');
      return;
    }
    
    if (!resumeUploaded) {
      message.warning('请先上传简历');
      return;
    }
    
    setResumeLoading(true);
    try {
      // 获取简历内容
      const resumeContent = userInfo?.resume_content || '';
      
      const res = await axios.post('/api/generate_questions_from_resume', 
        { 
          position,
          resume_content: resumeContent
        }, 
        { headers: { Authorization: localStorage.getItem('token') } }
      );
      
      if (res.data.success && Array.isArray(res.data.questions)) {
        setResumeQuestions(res.data.questions);
        message.success(`成功生成 ${res.data.questions.length} 个问题`);
      } else {
        message.error(res.data.error || '生成问题失败');
      }
    } catch (error) {
      console.error('生成问题错误:', error);
      message.error('生成问题失败');
    }
    setResumeLoading(false);
  };

  // 新增：获取用户信息函数
  const fetchUserInfo = async () => {
    try {
      const res = await axios.get('/api/profile', {
        headers: { Authorization: localStorage.getItem('token') }
      });
      if (res.data.success) {
        setUserInfo(res.data.user);
      }
    } catch (e) {
      console.error('获取用户信息失败:', e);
    }
  };

  // 组件挂载时初始化用户信息
  useEffect(() => {
    if (loggedIn) {
      initializeUserInfo();
    }
  }, []); // 只在组件挂载时执行一次

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
    // 如果不在管理面板中，管理员的行为应与普通用户一致
    if (!showAdminPanel) {
      setShowProfile(false);
      setActiveTab(tab);
    } else {
      setAdminTab(tab);
    }
  }

  // 获取面试记录
  useEffect(() => {
    const currentTab = showAdminPanel ? adminTab : activeTab;
    if (loggedIn && currentTab === 'record') {
      console.log('[前端] 开始获取面试记录');
      axios.get('/api/interview_records', {
        headers: { Authorization: localStorage.getItem('token') }
      }).then(res => {
        console.log('[前端] 面试记录API响应:', res.data);
        if (res.data.success) {
          console.log('[前端] 设置面试记录:', res.data.records);
          setInterviewRecords(res.data.records || []);
        }
      }).catch(err => {
        console.error('[前端] 获取面试记录失败:', err);
      });
    }
  }, [loggedIn, activeTab, adminTab, showAdminPanel]);

  // 新增：获取用户信息
  useEffect(() => {
    if (loggedIn && showProfile) {
      fetchUserInfo();
    }
  }, [loggedIn, showProfile]);

  // 新增：简历上传成功后刷新用户信息
  useEffect(() => {
    if (resumeUploaded && showProfile) {
      fetchUserInfo();
    }
  }, [resumeUploaded, showProfile]);

  useEffect(() => {
    const currentTab = showAdminPanel ? adminTab : activeTab;
    if (position && currentTab === 'interview') {
      axios.get('/api/questions', { params: { position } }).then(res => setQuestions(res.data));
      // axios.get('/api/learning_path', { params: { position } }).then(res => setLearningPath(res.data.resources));
    } else {
      setQuestions([]);
      // setLearningPath([]);
    }
  }, [position, activeTab, adminTab, showAdminPanel]);

  // 视频采集
  useEffect(() => {
    // 只有在登录状态下且在面试页面且不在个人信息页面时才启动摄像头
    const currentTab = showAdminPanel ? adminTab : activeTab;
    if (loggedIn && currentTab === 'interview' && !showProfile && !showAdminPanel) {
      // 检查浏览器是否支持getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('浏览器不支持摄像头访问');
        message.error('浏览器不支持摄像头访问，请使用现代浏览器');
        return;
      }

      // 请求摄像头权限
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user' // 使用前置摄像头
        }, 
        audio: false 
      })
        .then(stream => {
          console.log('摄像头启动成功');
          setStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // 等待视频加载完成
            videoRef.current.onloadedmetadata = () => {
              console.log('视频元数据加载完成');
            };
            videoRef.current.onerror = (error) => {
              console.error('视频加载错误:', error);
              message.error('视频加载失败');
            };
          }
        })
        .catch(error => {
          console.error('摄像头启动失败:', error);
          setStream(null);
          if (error.name === 'NotAllowedError') {
            message.error('摄像头权限被拒绝，请允许浏览器访问摄像头');
          } else if (error.name === 'NotFoundError') {
            message.error('未找到摄像头设备');
          } else if (error.name === 'NotReadableError') {
            message.error('摄像头被其他应用占用');
          } else {
            message.error('摄像头启动失败: ' + error.message);
          }
        });
    }

    // 清理函数
    return () => {
      if (stream) {
        console.log('停止摄像头流');
        stream.getTracks().forEach(track => {
          track.stop();
        });
        setStream(null);
      }
    };
  }, [activeTab, adminTab, showAdminPanel, showProfile, loggedIn, cameraRefreshFlag]); // 添加所有影响摄像头显示的依赖项

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
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      } 
    });
    const recorder = new window.MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
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
    setShowAdminPanel(false); // 重置管理员面板状态
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
      // 获取简历内容
      const resumeContent = userInfo?.resume_content || '';
      
      const res = await axios.post('/api/ai_questions', { 
        position,
        resume_content: resumeContent
      }, { 
        headers: { Authorization: localStorage.getItem('token') } 
      });
      
      if (res.data.success && res.data.question) {
        // 现在只返回一个问题，需要重新组织数据结构
        setAiQuestions([res.data.question]);
        setInterviewStarted(true);
        setCurrentQuestionIdx(0);
        setUserAnswers([]);
        setInterviewFinished(false);
        setChatId(res.data.chat_id); // 保存chat_id
        setAnswerRound(0);
      } else {
        message.error(res.data.error || '获取题目失败');
      }
    } catch (error) {
      console.error('获取题目失败:', error);
      message.error('获取题目失败');
    }
    setInterviewLoading(false);
  };

  // 提交代码作为答案
  const handleSubmitCode = async () => {
    if (!codeContent.trim()) {
      message.warning('请先编写代码');
      return;
    }
    
    const currentQ = aiQuestions[currentQuestionIdx];
    if (!chatId || !currentQ) {
      message.error('会话异常，请刷新页面重试');
      return;
    }
    
    setInterviewLoading(true);
    
    try {
      // 创建FormData对象
      const formData = new FormData();
      formData.append('position', position);
      formData.append('current_question', currentQ);
      formData.append('user_answer', codeContent);
      formData.append('chat_id', chatId);
      formData.append('code_submission', 'true'); // 标记这是代码提交
      
      // 请求下一个问题
      const res = await axios.post('/api/ai_next_question', formData, {
        headers: { 
          Authorization: localStorage.getItem('token'),
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (res.data.success && res.data.question) {
        // 添加新问题到问题列表
        setAiQuestions(prev => [...prev, res.data.question]);
        setCurrentQuestionIdx(idx => idx + 1);
        setAnswerRound(r => r + 1);
        message.success('代码提交成功，获取下一题');
      } else {
        // 面试结束
        setInterviewFinished(true);
        setInterviewStarted(false);
        message.info('面试已完成');
        
        // 自动保存面试记录
        if (userAnswers.length > 0) {
          handleEvaluateInterview();
        }
      }
    } catch (error) {
      console.error('提交代码失败:', error);
      message.error('提交代码失败');
    }
    
    setInterviewLoading(false);
  };

  // 提交当前题目答案，每次提交后都请求下一个问题
  const handleNextQuestion = async () => {
    const answerText = text;
    const currentQ = aiQuestions[currentQuestionIdx];
    if (!answerText && !audio) {
      message.warning('请作答后再提交');
      return;
    }
    if (!chatId || !currentQ) {
      message.error('会话异常，请刷新页面重试');
      return;
    }
    
    // 新增：随机拍摄一张照片
    message.info('正在拍摄面试照片...');
    const images = captureRandomImages();
    setCapturedImages(images);
    
    if (images.length > 0) {
      message.success(`成功拍摄 ${images.length} 张照片`);
    } else {
      message.warning('拍照失败，将仅基于文本进行评测');
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
      // 检查是否达到最大问题数量（10个问题）
      if (userAnswers.length >= 10) {
        // 达到最大问题数量，结束面试
        setInterviewFinished(true);
        setInterviewStarted(false);
        message.info('面试已完成（已达到最大问题数量）');
        
        // 自动保存面试记录
        if (userAnswers.length > 0) {
          handleEvaluateInterview();
        }
        return;
      }
      
      // 创建FormData对象，支持文件上传
      const formData = new FormData();
      formData.append('position', position);
      formData.append('current_question', currentQ);
      formData.append('user_answer', answerText);
      formData.append('chat_id', chatId);
      
      // 添加调试日志
      console.log('[前端] 发送数据:', {
        position,
        current_question: currentQ,
        user_answer: answerText,
        chat_id: chatId
      });
      
      // 如果有音频文件，直接添加到FormData
      if (audioFile) {
        formData.append('audio', audioFile);
      }
      
      // 如果有照片，也添加到FormData
      if (images && images.length > 0) {
        images.forEach((image, index) => {
          formData.append('images', image);
        });
      }
      
      // 请求下一个问题
      const res = await axios.post('/api/ai_next_question', formData, {
        headers: { 
          Authorization: localStorage.getItem('token'),
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (res.data.success && res.data.question) {
        // 添加新问题到问题列表
        setAiQuestions(prev => [...prev, res.data.question]);
        setCurrentQuestionIdx(idx => idx + 1);
        setAnswerRound(r => r + 1);
      } else {
        // 面试结束
        setInterviewFinished(true);
        setInterviewStarted(false);
        message.info('面试已完成');
        
        // 自动保存面试记录
        if (userAnswers.length > 0) {
          handleEvaluateInterview();
        }
      }
    } catch (error) {
      console.error('获取下一个问题失败:', error);
      message.error('获取下一个问题失败');
    }
    
    setInterviewLoading(false);
  };

  // 新增：自动展示AI评价结果
  const handleEvaluateInterview = async () => {
    if (!userAnswers.length) {
      message.warning('没有答案记录');
      return;
    }
    
    console.log('[前端] 开始评估面试');
    console.log('[前端] 职位:', position);
    console.log('[前端] 问题:', aiQuestions);
    console.log('[前端] 答案:', userAnswers.map(a => a.text));
    
    setInterviewLoading(true);
    try {
      const res = await axios.post('/api/interview_evaluate', {
        position,
        questions: aiQuestions,
        answers: userAnswers.map(a => a.text)
      }, {
        headers: { Authorization: localStorage.getItem('token') }
      });
      
      console.log('[前端] 面试评估API响应:', res.data);
      
      if (res.data.success) {
        setResult(res.data.result);
        message.success('评价完成');
        console.log('[前端] 面试评估成功');
      } else {
        message.error('评价失败');
        console.error('[前端] 面试评估失败:', res.data.error);
      }
    } catch (error) {
      console.error('[前端] 面试评估异常:', error);
      message.error('评价失败');
    }
    setInterviewLoading(false);
  };

  // 顶部横栏内容根据页面动态变化
  const getTopBarTitle = () => {
    if (!loggedIn) return showRegister ? '注册新账号' : '欢迎登录';
    if (showProfile) return '个人信息';
    if (isAdmin) {
      if (adminTab === 'records') return '管理员：所有用户测评记录';
      if (adminTab === 'questions') return '管理员：题库管理';
      return '管理员页面';
    }
    return '多模态智能模拟面试评测智能体';
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

  // 左侧竖栏样式（完全统一管理员页面）
  const sidebarStyle = {
    width: sidebarCollapsed ? 80 : 200,
    minWidth: sidebarCollapsed ? 80 : 200,
    background: '#001529',
    height: 'calc(100vh - 56px)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '2px 0 8px 0 rgba(0, 0, 0, 0.1)',
    borderRight: '1px solid #303030',
    transition: 'all 0.3s ease',
    position: 'fixed',
    left: 0,
    top: 56,
    zIndex: 1000,
  };

    // 页面主体内容渲染
  let mainContent = null;
  if (!loggedIn) {
    mainContent = (
      <div style={loginContainerStyle}>
        {/* 浮动装饰元素 */}
        <div style={{...floatingShapeStyle, width: '100px', height: '100px', top: '10%', left: '10%', animationDelay: '0s'}}></div>
        <div style={{...floatingShapeStyle, width: '150px', height: '150px', top: '20%', right: '15%', animationDelay: '2s'}}></div>
        <div style={{...floatingShapeStyle, width: '80px', height: '80px', bottom: '20%', left: '20%', animationDelay: '4s'}}></div>
        
        {showRegister ? (
          <Card style={loginCardStyle} bordered={false}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={logoStyle}>🎯 智能面试助手</div>
              <div style={subtitleStyle}>注册账号，开启你的智能模拟面试之旅</div>
            </div>
            <Form layout="vertical" onFinish={onRegister} autoComplete="off">
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <Form.Item name="name" label={<span style={{fontWeight: 500, color: '#374151'}}>姓名</span>} rules={[{ required: true, message: '请输入姓名' }]} style={{ flex: 1 }}>
                  <Input style={inputStyle} size="large" allowClear prefix={<UserOutlined style={{color: '#9ca3af'}} />} />
                </Form.Item>
                <Form.Item name="email" label={<span style={{fontWeight: 500, color: '#374151'}}>邮箱</span>} rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]} style={{ flex: 1 }}>
                  <Input style={inputStyle} size="large" allowClear prefix={<MailOutlined style={{color: '#9ca3af'}} />} />
                </Form.Item>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <Form.Item name="phone" label={<span style={{fontWeight: 500, color: '#374151'}}>手机号</span>} rules={[{ required: true, message: '请输入手机号' }]} style={{ flex: 1 }}>
                  <Input style={inputStyle} size="large" allowClear prefix={<PhoneOutlined style={{color: '#9ca3af'}} />} />
                </Form.Item>
                <Form.Item name="school" label={<span style={{fontWeight: 500, color: '#374151'}}>学校</span>} rules={[{ required: true, message: '请输入学校' }]} style={{ flex: 1 }}>
                  <Input style={inputStyle} size="large" allowClear prefix={<BankOutlined style={{color: '#9ca3af'}} />} />
                </Form.Item>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <Form.Item name="grade" label={<span style={{fontWeight: 500, color: '#374151'}}>年级</span>} rules={[{ required: true, message: '请输入年级' }]} style={{ flex: 1 }}>
                  <Input style={inputStyle} size="large" allowClear prefix={<BookOutlined style={{color: '#9ca3af'}} />} />
                </Form.Item>
                <Form.Item name="target_position" label={<span style={{fontWeight: 500, color: '#374151'}}>目标岗位</span>} rules={[{ required: true, message: '请输入目标岗位' }]} style={{ flex: 1 }}>
                  <Input style={inputStyle} size="large" allowClear prefix={<AimOutlined style={{color: '#9ca3af'}} />} />
                </Form.Item>
              </div>
              <Form.Item name="password" label={<span style={{fontWeight: 500, color: '#374151'}}>密码</span>} rules={[{ required: true, min: 6, message: '密码至少6位' }]} style={{ marginBottom: 0 }}>
                <Input.Password style={inputStyle} size="large" allowClear prefix={<LockOutlined style={{color: '#9ca3af'}} />} />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" style={loginBtnStyle} size="large">
                  <UserAddOutlined style={{marginRight: 8}} />
                  注册账号
                </Button>
              </Form.Item>
            </Form>
            <div style={{ textAlign: 'center', marginTop: 24, color: '#6b7280' }}>
              已有账号？<a style={{ color: '#667eea', cursor: 'pointer', fontWeight: 500 }} onClick={() => setShowRegister(false)}>去登录</a>
            </div>
          </Card>
        ) : (
          <Card style={loginCardStyle} bordered={false}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={logoStyle}>🎯 智能面试助手</div>
              <div style={subtitleStyle}>欢迎回来，开启你的智能模拟面试之旅</div>
            </div>
            <Form layout="vertical" onFinish={onLogin} autoComplete="off">
              <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入邮箱' }]} style={{ marginBottom: 20 }}>
                <Input placeholder="请输入邮箱" style={inputStyle} size="large" autoFocus allowClear prefix={<MailOutlined style={{color: '#9ca3af'}} />} />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]} style={{ marginBottom: 24 }}>
                <Input.Password placeholder="请输入密码" style={inputStyle} size="large" allowClear prefix={<LockOutlined style={{color: '#9ca3af'}} />} />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={loginLoading} style={loginBtnStyle} size="large">
                  <LoginOutlined style={{marginRight: 8}} />
                  登录
                </Button>
              </Form.Item>
            </Form>
            <div style={{ textAlign: 'center', marginTop: 24, color: '#6b7280' }}>
              没有账号？<a style={{ color: '#667eea', cursor: 'pointer', fontWeight: 500 }} onClick={() => setShowRegister(true)}>去注册</a>
            </div>
          </Card>
        )}
      </div>
    );
  } else if (showProfile) {
    const currentUserInfo = userInfo || {
      name: '加载中...',
      email: '加载中...',
      phone: '加载中...',
      school: '加载中...',
      grade: '加载中...',
      target_position: '加载中...',
      is_admin: isAdmin,
      resume_content: null,
      resume_filename: null,
      resume_upload_time: null
    };
    mainContent = (
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 56px)', paddingTop: '56px' }}>
        <div style={{ maxWidth: 900, width: '100%', background: '#fff', boxShadow: '0 2px 12px 0 rgba(0, 80, 180, 0.08)', padding: 32, position: 'relative', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 32 }}>
          <Button onClick={() => {
            setShowProfile(false);
            // 如果返回到面试页面，强制重新初始化摄像头
            const currentTab = showAdminPanel ? adminTab : activeTab;
            if (currentTab === 'interview') {
              setCameraRefreshFlag(flag => flag + 1);
            }
          }} style={{ position: 'absolute', top: 24, right: 32, borderRadius: 4, background: '#f0f2f5', color: '#1976d2', border: 'none', fontWeight: 500 }}>返回</Button>
          
          {/* 基本信息区 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {/* 左侧头像区 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 160 }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#e3f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, color: '#1976d2', marginBottom: 16, overflow: 'hidden', position: 'relative' }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  currentUserInfo.name && currentUserInfo.name !== '加载中...' ? currentUserInfo.name[0] : 'U'
                )}
                <AvatarUpload onFileSelect={handleAvatarChange}>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#1976d2', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: '2px solid #fff' }} title="更换头像">
                    <span role="img" aria-label="upload">⬆️</span>
                  </div>
                </AvatarUpload>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1976d2', marginBottom: 4 }}>{currentUserInfo.name}</div>
              <div style={{ color: '#888', fontSize: 15 }}>{currentUserInfo.is_admin ? '管理员' : '普通用户'}</div>
            </div>
            {/* 右侧信息区 */}
            <div style={{ flex: 1, borderLeft: '1px solid #f0f0f0', paddingLeft: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div><b>邮箱：</b>{currentUserInfo.email}</div>
              <div><b>手机号：</b>{currentUserInfo.phone}</div>
              <div><b>学校：</b>{currentUserInfo.school}</div>
              <div><b>年级：</b>{currentUserInfo.grade}</div>
              <div><b>目标岗位：</b>{currentUserInfo.target_position}</div>
            </div>
          </div>
          
          {/* 简历信息区 */}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
            <div style={{ fontWeight: 700, color: '#1976d2', fontSize: 18, marginBottom: 16 }}>简历信息</div>
            {currentUserInfo.resume_content ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#52c41a', fontSize: 16 }}>✓</span>
                  <span><b>文件名：</b>{currentUserInfo.resume_filename}</span>
                  <span style={{ color: '#888', fontSize: 12 }}>
                    上传时间：{currentUserInfo.resume_upload_time ? new Date(currentUserInfo.resume_upload_time).toLocaleString() : '未知'}
                  </span>
                </div>
                <div style={{ 
                  background: '#f7fbff', 
                  border: '1px solid #e3f0ff', 
                  borderRadius: 8, 
                  padding: 16, 
                  maxHeight: 300, 
                  overflowY: 'auto',
                  fontSize: 14,
                  lineHeight: 1.6
                }}>
                  <MarkdownRenderer content={currentUserInfo.resume_content} />
                </div>
              </div>
            ) : (
              <div style={{ 
                background: '#f7fbff', 
                border: '1px dashed #b3d8ff', 
                borderRadius: 8, 
                padding: 24, 
                textAlign: 'center',
                color: '#888'
              }}>
                暂无简历信息，请在面试页面上传简历
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } else if (loggedIn && isAdmin && showAdminPanel) {
    // 管理员页面 - 使用新的AdminPanel组件
    mainContent = (
      <div style={{ paddingTop: '56px' }}>
        <AdminPanel 
          onLogout={() => {
            setShowAdminPanel(false);
            onLogout();
          }} 
          onBack={() => setShowAdminPanel(false)}
        />
      </div>
    );
  } else {
    // 普通用户页面tab切换
    mainContent = (
      <div style={{ 
        width: '100%', 
        display: 'flex', 
        minHeight: 'calc(100vh - 56px)',
        marginLeft: sidebarCollapsed ? 80 : 200,
        transition: 'margin-left 0.3s ease'
      }}>
        {/* 侧边栏 */}
        <div style={sidebarStyle}>
          {/* Logo区域 */}
          <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #303030',
            color: '#fff',
            fontSize: 18,
            fontWeight: 600,
          }}>
            {!sidebarCollapsed && <span>智能面试</span>}
            {sidebarCollapsed && <span>🎯</span>}
          </div>
          
          {/* 导航菜单 */}
          <div style={{ flex: 1, padding: '16px 0' }}>
            {/* 面试页面 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 24px',
              margin: '4px 0',
              background: (showAdminPanel ? adminTab : activeTab) === 'interview' ? '#1890ff' : 'transparent',
              color: (showAdminPanel ? adminTab : activeTab) === 'interview' ? '#fff' : '#bfbfbf',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 500,
              borderRight: (showAdminPanel ? adminTab : activeTab) === 'interview' ? '3px solid #1890ff' : '3px solid transparent',
            }} onClick={() => (isAdmin ? handleAdminTabChange : handleTabChange)('interview')}>
              <VideoCameraOutlined style={{ marginRight: sidebarCollapsed ? 0 : 12, fontSize: 16 }} />
              {!sidebarCollapsed && <span>模拟面试</span>}
            </div>
            
            {/* 历史记录 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 24px',
              margin: '4px 0',
              background: (showAdminPanel ? adminTab : activeTab) === 'record' ? '#1890ff' : 'transparent',
              color: (showAdminPanel ? adminTab : activeTab) === 'record' ? '#fff' : '#bfbfbf',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 500,
              borderRight: (showAdminPanel ? adminTab : activeTab) === 'record' ? '3px solid #1890ff' : '3px solid transparent',
            }} onClick={() => (isAdmin ? handleAdminTabChange : handleTabChange)('record')}>
              <HistoryOutlined style={{ marginRight: sidebarCollapsed ? 0 : 12, fontSize: 16 }} />
              {!sidebarCollapsed && <span>历史记录</span>}
            </div>
            
            {/* 管理按钮 - 仅管理员可见 */}
            {isAdmin && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 24px',
                margin: '4px 0',
                background: showAdminPanel ? '#1890ff' : 'transparent',
                color: showAdminPanel ? '#fff' : '#bfbfbf',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 500,
                borderRight: showAdminPanel ? '3px solid #1890ff' : '3px solid transparent',
              }} onClick={() => setShowAdminPanel(!showAdminPanel)}>
                <SettingOutlined style={{ marginRight: sidebarCollapsed ? 0 : 12, fontSize: 16 }} />
                {!sidebarCollapsed && <span>管理后台</span>}
              </div>
            )}
          </div>
          
          {/* 收起/展开按钮 - 放在底部 */}
          <div style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
          }}>
            <Button 
              type="primary" 
              block 
              icon={<span style={{ fontSize: 12 }}>{sidebarCollapsed ? '→' : '←'}</span>}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: '#1890ff',
                border: 'none',
                height: 40,
                borderRadius: 6,
              }}
            >
              {!sidebarCollapsed && <span>收起侧边栏</span>}
            </Button>
          </div>
        </div>
        {/* 主内容区域 */}
        <div style={{ flex: 1, display: 'flex', height: '100%', paddingTop: '56px' }}>
                      {/* 面试页面 - 四个区域布局 */}
            {(!showAdminPanel && activeTab === 'interview') && (
              <div style={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: '1fr 1fr',
                  gap: '10px',
                  height: 'calc(100vh - 56px - 56px - 20px)',
                  width: '80vw',
                  maxWidth: '1200px',
                  padding: '10px',
                  overflow: 'hidden',
                  background: 'transparent'
                }}>
                  {/* 左上角：岗位选择、简历上传和题目展示 */}
                  <div style={{ 
                    background: '#fff', 
                    borderRadius: '8px', 
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '16px', color: '#1976d2', marginBottom: '8px' }}>
                      岗位选择与题目
                    </div>
                    
                    {/* 岗位选择 */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                    
                    {/* 简历上传 */}
                    <div>
                      <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: '8px' }}>简历上传</div>
                      <FileUpload
                        accept=".md"
                        onFileSelect={handleResumeUpload}
                        buttonText={resumeUploaded ? '重新上传简历' : '上传简历(.md)'}
                        disabled={interviewStarted || resumeLoading}
                        loading={resumeLoading}
                      />
                      {resumeUploaded && (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ fontSize: '12px', color: '#52c41a' }}>
                            ✓ 简历已上传: {resumeFile?.name}
                          </div>
                          <Button 
                            size="small" 
                            onClick={handleGenerateQuestionsFromResume}
                            loading={resumeLoading}
                            disabled={!position || interviewStarted}
                            style={{ marginTop: '4px' }}
                          >
                            基于简历生成问题
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* 题目展示 */}
                    <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                      {interviewStarted && aiQuestions.length > 0 && !interviewFinished ? (
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1976d2' }}>
                          第{currentQuestionIdx+1}题：{aiQuestions[currentQuestionIdx]}
                        </div>
                      ) : !interviewStarted ? (
                        <div style={{ color: '#888' }}>
                          {resumeQuestions.length > 0 ? (
                            <div>
                              <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: '8px' }}>基于简历生成的问题：</div>
                              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {resumeQuestions.map((q, idx) => (
                                  <div key={idx} style={{ 
                                    padding: '8px', 
                                    marginBottom: '8px', 
                                    background: '#f7fbff', 
                                    borderRadius: '6px', 
                                    fontSize: '14px',
                                    border: '1px solid #e3f0ff'
                                  }}>
                                    {idx + 1}. {q}
                                  </div>
                                ))}
                              </div>
                              <Button 
                                type="primary" 
                                size="small" 
                                style={{ marginTop: '8px' }}
                                onClick={() => {
                                  setAiQuestions(resumeQuestions);
                                  setInterviewStarted(true);
                                  setCurrentQuestionIdx(0);
                                  setUserAnswers([]);
                                  setInterviewFinished(false);
                                  setSessionId(Math.random().toString(36).substr(2, 9));
                                  setAnswerRound(0);
                                }}
                              >
                                使用这些问题开始面试
                              </Button>
                            </div>
                          ) : (
                            <div>请点击"开始面试"获取AI题目，或上传简历生成针对性问题</div>
                          )}
                        </div>
                      ) : interviewFinished ? (
                        <div style={{ color: '#52c41a' }}>面试已完成，评测结果已保存</div>
                      ) : null}
                    </div>
                  </div>
                  
                  {/* 右上角：视频展示 */}
                  <div style={{ 
                    background: '#fff', 
                    borderRadius: '8px', 
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '16px', color: '#1976d2', marginBottom: '12px' }}>
                      面试视频
                    </div>
                    <div style={{ 
                      flex: 1, 
                      background: '#f0f2f5', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <video 
                        ref={videoRef} 
                        key={cameraRefreshFlag} 
                        autoPlay 
                        muted 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          borderRadius: '8px', 
                          objectFit: 'cover', 
                          background: '#e0e0e0' 
                        }} 
                      />
                      {/* 摄像头状态指示器 */}
                      <div style={{ 
                        position: 'absolute', 
                        top: '10px', 
                        right: '10px', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px', 
                        fontWeight: 500,
                        background: stream ? '#52c41a' : '#ff4d4f',
                        color: 'white'
                      }}>
                        {stream ? '摄像头已连接' : '摄像头未连接'}
                      </div>
                      {/* 摄像头测试按钮 */}
                      <Button 
                        size="small"
                        style={{ 
                          position: 'absolute', 
                          bottom: '10px', 
                          right: '10px',
                          background: '#1890ff',
                          color: 'white',
                          border: 'none'
                        }}
                        onClick={() => setShowCameraTest(true)}
                      >
                        测试摄像头
                      </Button>
                    </div>
                    {/* 隐藏的canvas用于拍照 */}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                  </div>
                  
                  {/* 左下角：代码编辑器 */}
                  <div style={{ 
                    background: '#fff', 
                    borderRadius: '8px', 
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '16px', color: '#1976d2', marginBottom: '12px' }}>
                      代码编辑器
                    </div>
                    <div style={{ 
                      flex: 1, 
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid #e0e0e0'
                    }}>
                                          <Editor
                      height="100%"
                      defaultLanguage="javascript"
                      value={codeContent}
                      onChange={(value) => setCodeContent(value || '')}
                      theme="vs"
                      options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: 'on',
                          roundedSelection: false,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          wordWrap: 'on',
                          folding: true,
                          foldingStrategy: 'indentation',
                          showFoldingControls: 'always',
                          renderLineHighlight: 'all',
                          selectOnLineNumbers: true,
                          glyphMargin: true,
                          useTabStops: false,
                          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                          tabSize: 2,
                          insertSpaces: true,
                          detectIndentation: false,
                          trimAutoWhitespace: true,
                          largeFileOptimizations: true,
                          suggest: {
                            showKeywords: true,
                            showSnippets: true,
                            showClasses: true,
                            showConstructors: true,
                            showFunctions: true,
                            showMethods: true,
                            showProperties: true,
                            showEvents: true,
                            showOperators: true,
                            showUnits: true,
                            showValues: true,
                            showConstants: true,
                            showEnums: true,
                            showEnumMembers: true,
                            showColors: true,
                            showFiles: true,
                            showReferences: true,
                            showFolders: true,
                            showTypeParameters: true,
                            showWords: true,
                            showUsers: true,
                            showIssues: true,
                            showColors: true,
                            showCustomcolors: true,
                            showVariables: true,
                            showUserSnippets: true,
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* 右下角：文本回复和语音回复 */}
                  <div style={{ 
                    background: '#fff', 
                    borderRadius: '8px', 
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '16px', color: '#1976d2' }}>
                      回答区域
                    </div>
                    
                    {/* 语音回复 */}
                    <div style={{ flex: '0 0 auto' }}>
                      <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: '8px' }}>语音作答</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ 
                          fontSize: '14px', 
                          color: '#6b7280',
                          flex: 1
                        }}>
                          点击右侧按钮开始录音
                        </span>
                        {!recording ? (
                          <Button 
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                              border: 'none',
                              color: '#fff',
                              fontSize: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.10)',
                              flex: '0 0 auto'
                            }} 
                            onClick={startRecording} 
                            icon={<span role="img" aria-label="mic">🎤</span>} 
                            disabled={!interviewStarted || interviewFinished} 
                          />
                        ) : (
                          <Button 
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              background: 'linear-gradient(90deg, #f44336 0%, #ff9800 100%)',
                              border: 'none',
                              color: '#fff',
                              fontSize: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.10)',
                              flex: '0 0 auto'
                            }} 
                            onClick={stopRecording} 
                            icon={<span role="img" aria-label="stop">⏹️</span>} 
                            disabled={!interviewStarted || interviewFinished} 
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* 文本回复 */}
                    <div style={{ flex: 1, minHeight: 0 }}>
                      <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: '8px' }}>文本作答</div>
                      <Input.TextArea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="请输入你的面试回答文本（可选）"
                        rows={3}
                        style={{ 
                          borderRadius: '6px', 
                          background: '#f7fbff', 
                          border: '1px solid #b3d8ff',
                          height: '80px',
                          resize: 'none'
                        }}
                        disabled={!interviewStarted || interviewFinished}
                      />
                    </div>
                    
                                      {/* 提交按钮 */}
                  <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
                    <Button 
                      type="primary" 
                      onClick={handleNextQuestion} 
                      loading={interviewLoading} 
                      style={{ 
                        borderRadius: '4px', 
                        background: '#1976d2', 
                        border: 'none', 
                        fontWeight: 600, 
                        fontSize: '14px',
                        height: '36px',
                        flex: 1
                      }} 
                      disabled={!interviewStarted || interviewFinished}
                    >
                      {currentQuestionIdx < 9 ? '提交本题，下一题' : '提交并完成面试'}
                    </Button>
                    <Button 
                      type="default" 
                      onClick={() => handleSubmitCode()} 
                      loading={interviewLoading} 
                      style={{ 
                        borderRadius: '4px', 
                        border: '1px solid #1976d2', 
                        color: '#1976d2',
                        fontWeight: 600, 
                        fontSize: '14px',
                        height: '36px',
                        flex: 1
                      }} 
                      disabled={!interviewStarted || interviewFinished}
                    >
                      提交代码
                    </Button>
                  </div>
                  </div>
                </div>
              </div>
            )}
            {(!showAdminPanel && activeTab === 'record') && (
              <div style={{ flex: 1, background: '#f4f8fd', padding: 32, paddingTop: '56px', overflowY: 'auto', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' }}>
                {/* 左侧：面试记录列表 */}
                <div style={{ width: 260, minWidth: 180, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.06)', marginRight: 32, padding: 16, height: 480, overflowY: 'auto' }}>
                  <div style={{ fontWeight: 700, color: '#1976d2', fontSize: 18, marginBottom: 16 }}>历史面试</div>
                  {interviewRecords.length === 0 ? (
                    <div style={{ color: '#888', fontSize: 16, textAlign: 'center' }}>暂无记录</div>
                  ) : (
                    interviewRecords.map((rec, idx) => (
                      <div key={rec.id || idx} style={{ marginBottom: 18, cursor: 'pointer', padding: 8, borderRadius: 6, background: selectedRecord && selectedRecord.id === rec.id ? '#e3f0ff' : 'transparent' }}
                        onClick={() => setSelectedRecord(rec)}>
                        <div style={{ fontWeight: 600, color: '#1976d2' }}>{rec.position}</div>
                        <div style={{ color: '#888', fontSize: 13 }}>{rec.created_at ? rec.created_at.split('T')[0] : ''}</div>
                      </div>
                    ))
                  )}
                </div>
                {/* 右侧：详情区 */}
                <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* 右上：六维图 */}
                  <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.06)', padding: 24, marginBottom: 0, minHeight: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#1976d2', fontSize: 18, marginBottom: 12 }}>能力六维雷达图</div>
                    {selectedRecord && selectedRecord.result && (() => {
                      let result = {};
                      console.log('原始result数据:', selectedRecord.result);
                      
                      // 检查result是否已经是对象
                      if (typeof selectedRecord.result === 'object') {
                        result = selectedRecord.result;
                        console.log('result已经是对象:', result);
                      } else {
                        // 如果是字符串，则解析
                        try { 
                          result = JSON.parse(selectedRecord.result || '{}'); 
                          console.log('解析后的result:', result);
                        } catch (e) {
                          console.error('解析result失败:', e);
                          return <div style={{ color: '#888' }}>数据格式错误</div>;
                        }
                      }
                      
                      // 处理新的数据格式：result.evaluation 包含JSON字符串
                      if (result.evaluation) {
                        console.log('找到evaluation字段:', result.evaluation);
                        // 提取JSON字符串（去除```json和```标记）
                        let evaluationStr = result.evaluation;
                        if (evaluationStr.includes('```json')) {
                          evaluationStr = evaluationStr.replace(/```json\n?/, '').replace(/```\n?/, '');
                        }
                        console.log('提取的evaluation字符串:', evaluationStr);
                        
                        try {
                          const evaluationData = JSON.parse(evaluationStr);
                          console.log('解析的evaluation数据:', evaluationData);
                          if (evaluationData.abilities) {
                            console.log('abilities数据:', evaluationData.abilities);
                            return <RadarChart abilities={evaluationData.abilities} />;
                          }
                        } catch (evalError) {
                          console.error('解析evaluation失败:', evalError);
                        }
                      }
                      
                      // 兼容旧格式：直接包含abilities
                      if (result.abilities) {
                        console.log('abilities数据:', result.abilities);
                        return <RadarChart abilities={result.abilities} />;
                      }
                      
                      console.log('没有abilities数据');
                      return <div style={{ color: '#888' }}>暂无能力评测数据</div>;
                    })()}
                  </div>
                  {/* 右下：岗位建议 */}
                  <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.06)', padding: 24, minHeight: 120 }}>
                    <div style={{ fontWeight: 700, color: '#1976d2', fontSize: 18, marginBottom: 12 }}>岗位建议</div>
                    {selectedRecord && selectedRecord.result && (() => {
                      let result = {};
                      
                      // 检查result是否已经是对象
                      if (typeof selectedRecord.result === 'object') {
                        result = selectedRecord.result;
                      } else {
                        // 如果是字符串，则解析
                        try { 
                          result = JSON.parse(selectedRecord.result || '{}'); 
                        } catch (e) {
                          console.error('解析result失败:', e);
                          return <div style={{ color: '#888' }}>数据格式错误</div>;
                        }
                      }
                      
                      // 处理新的数据格式：result.evaluation 包含JSON字符串
                      if (result.evaluation) {
                        // 提取JSON字符串（去除```json和```标记）
                        let evaluationStr = result.evaluation;
                        if (evaluationStr.includes('```json')) {
                          evaluationStr = evaluationStr.replace(/```json\n?/, '').replace(/```\n?/, '');
                        }
                        
                        try {
                          const evaluationData = JSON.parse(evaluationStr);
                          if (evaluationData.suggestions && evaluationData.suggestions.length > 0) {
                            return <ul style={{ paddingLeft: 18 }}>{evaluationData.suggestions.map((s, i) => <li key={i} style={{ color: '#444', marginBottom: 6 }}>{s}</li>)}</ul>;
                          }
                        } catch (evalError) {
                          console.error('解析evaluation失败:', evalError);
                        }
                      }
                      
                      // 兼容旧格式：直接包含suggestions
                      if (result.suggestions && result.suggestions.length > 0) {
                        return <ul style={{ paddingLeft: 18 }}>{result.suggestions.map((s, i) => <li key={i} style={{ color: '#444', marginBottom: 6 }}>{s}</li>)}</ul>;
                      }
                      
                      return <div style={{ color: '#888' }}>暂无建议</div>;
                    })()}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'doc' && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#1976d2', fontWeight: 600, background: '#fff', paddingTop: '56px' }}>
                文档中心（mock）
              </div>
            )}
          </div>
        </div>
      // </div>
    );
  }

  // 页面统一布局：顶部横栏+主体内容
  return (
    <div style={{ minHeight: '100vh', background: '#f4f8fd' }}>
      <TopBar />
      {mainContent}
      {showCameraTest && (
        <CameraTest onClose={() => setShowCameraTest(false)} />
      )}
    </div>
  );
}

export default App; 