import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Upload, message, Select, List, Divider } from 'antd';
import axios from 'axios';
import RadarChart from './components/RadarChart';

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

  useEffect(() => {
    axios.get('/api/positions').then(res => setPositions(res.data));
  }, []);

  useEffect(() => {
    if (position) {
      axios.get('/api/questions', { params: { position } }).then(res => setQuestions(res.data));
      axios.get('/api/learning_path', { params: { position } }).then(res => setLearningPath(res.data.resources));
    } else {
      setQuestions([]);
      setLearningPath([]);
    }
  }, [position]);

  const handleAudioChange = (info) => {
    if (info.file.status === 'done' || info.file.status === 'uploading') {
      setAudio(info.file.originFileObj);
    }
  };
  const handleVideoChange = (info) => {
    if (info.file.status === 'done' || info.file.status === 'uploading') {
      setVideo(info.file.originFileObj);
    }
  };

  const handleSubmit = async () => {
    if (!audio) {
      message.error('请上传音频文件');
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

  return (
    <Card title="模拟面试评测" style={{ maxWidth: 700, margin: '40px auto' }}>
      <Select
        style={{ width: 300, marginBottom: 16 }}
        placeholder="请选择面试岗位/领域"
        value={position}
        onChange={setPosition}
        options={positions.map(p => ({ label: p, value: p }))}
      />
      {questions.length > 0 && (
        <Card type="inner" title="典型面试题" style={{ marginBottom: 16 }}>
          <List
            size="small"
            dataSource={questions}
            renderItem={item => <List.Item>{item}</List.Item>}
          />
        </Card>
      )}
      <Upload accept="audio/*" showUploadList={false} beforeUpload={() => false} onChange={handleAudioChange}>
        <Button>上传音频文件</Button>
      </Upload>
      <Upload accept="video/*" showUploadList={false} beforeUpload={() => false} onChange={handleVideoChange} style={{ marginTop: 8 }}>
        <Button style={{ marginTop: 8 }}>上传视频文件（可选）</Button>
      </Upload>
      <Input.TextArea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="请输入你的面试回答文本（可选）"
        rows={4}
        style={{ margin: '16px 0' }}
      />
      <Button type="primary" onClick={handleSubmit} loading={uploading} style={{ marginBottom: 16 }}>
        提交评测
      </Button>
      {result && (
        <>
          <RadarChart data={result.abilities} />
          {result.key_issues && result.key_issues.length > 0 && (
            <Card type="inner" title="关键问题定位" style={{ marginTop: 16 }}>
              <ul>
                {result.key_issues.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </Card>
          )}
          <Card type="inner" title="改进建议" style={{ marginTop: 16 }}>
            <ul>
              {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </Card>
        </>
      )}
      {learningPath && learningPath.length > 0 && (
        <>
          <Divider orientation="left" style={{ marginTop: 32 }}>个性化学习资源推荐</Divider>
          <List
            bordered
            dataSource={learningPath}
            renderItem={item => (
              <List.Item>
                <b>{item.type}：</b>{item.title} <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url !== '#' ? '查看' : ''}</a>
              </List.Item>
            )}
          />
        </>
      )}
    </Card>
  );
}

export default App; 