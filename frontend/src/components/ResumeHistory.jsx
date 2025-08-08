import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Row, 
  Col,
  Modal,
  Input,
  message,
  Progress,
  Divider,
  Empty,
  Tabs
} from 'antd';
import { 
  DownloadOutlined, 
  EyeOutlined, 
  StarOutlined,
  StarFilled,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import ResumePreview from './ResumePreview';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ResumeHistory = () => {
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [fileNameModalVisible, setFileNameModalVisible] = useState(false);
  const [fileName, setFileName] = useState('');
  const [currentResume, setCurrentResume] = useState(null);

  useEffect(() => {
    fetchHistories();
  }, []);

  const fetchHistories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/resume/histories', {
        headers: { Authorization: token }
      });
      setHistories(response.data.histories || []);
    } catch (error) {
      message.error('获取简历历史失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (history) => {
    setSelectedHistory(history);
    setPreviewVisible(true);
  };

  const handleDownload = async (history, index = 0) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/resume/download/${history.id}`, {
        responseType: 'blob',
        headers: { Authorization: token }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `简历_${history.task_id}_${index + 1}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('下载成功');
    } catch (error) {
      message.error('下载失败');
    }
  };

  const handleCollect = async (history) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/resume/collect/${history.id}`, {}, {
        headers: { Authorization: token }
      });
      if (response.data.success) {
        message.success('收藏成功');
        fetchHistories();
      }
    } catch (error) {
      message.error('收藏失败');
    }
  };

  const handleSaveResume = async () => {
    if (!fileName.trim()) {
      message.error('请输入文件名');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/resume/save/${selectedHistory.id}`, {
        file_name: fileName
      }, {
        headers: { Authorization: token }
      });
      if (response.data.success) {
        message.success('保存成功');
        setFileNameModalVisible(false);
        setFileName('');
        fetchHistories();
      }
    } catch (error) {
      message.error('保存失败');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'processing':
        return '处理中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return '未知';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processing':
        return 'blue';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'default';
    }
  };

  const renderResumePreview = (resumeData, index) => {
    if (!resumeData) return null;
    
    return (
      <Card
        key={index}
        style={{ 
          width: '100%', 
          marginBottom: '16px',
          border: '1px solid #d9d9d9',
          borderRadius: '8px'
        }}
        bodyStyle={{ padding: '16px' }}
      >
        <div style={{ 
          background: '#f8f9fa', 
          padding: '16px', 
          borderRadius: '4px',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          lineHeight: '1.4'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>RESUME</h2>
            <h3 style={{ margin: '8px 0', fontSize: '16px' }}>
              {resumeData.personal_info?.name || '姓名'}
            </h3>
          </div>
          
          {resumeData.personal_info && (
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ margin: '8px 0', fontSize: '14px', fontWeight: 'bold' }}>基本信息</h4>
              <p style={{ margin: '4px 0', fontSize: '11px' }}>
                性别：{resumeData.personal_info.gender || ''} | 
                年龄：{resumeData.personal_info.age || ''} | 
                手机：{resumeData.personal_info.phone || ''}
              </p>
              <p style={{ margin: '4px 0', fontSize: '11px' }}>
                邮箱：{resumeData.personal_info.email || ''} | 
                身份：{resumeData.personal_info.identity || ''}
              </p>
            </div>
          )}
          
          {resumeData.education && (
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ margin: '8px 0', fontSize: '14px', fontWeight: 'bold' }}>教育经历</h4>
              <p style={{ margin: '4px 0', fontSize: '11px' }}>
                {resumeData.education.school || ''} | 
                {resumeData.education.major || ''} | 
                {resumeData.education.degree || ''}
              </p>
            </div>
          )}
          
          {resumeData.work_experience && (
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ margin: '8px 0', fontSize: '14px', fontWeight: 'bold' }}>工作经历</h4>
              <p style={{ margin: '4px 0', fontSize: '11px' }}>
                {resumeData.work_experience.company || ''} | 
                {resumeData.work_experience.position || ''}
              </p>
            </div>
          )}
          
          {resumeData.project_experience && (
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ margin: '8px 0', fontSize: '14px', fontWeight: 'bold' }}>项目经历</h4>
              <p style={{ margin: '4px 0', fontSize: '11px' }}>
                {resumeData.project_experience.project_name || ''} | 
                {resumeData.project_experience.role || ''}
              </p>
            </div>
          )}
          
          {resumeData.competition && (
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ margin: '8px 0', fontSize: '14px', fontWeight: 'bold' }}>竞赛经历</h4>
              <p style={{ margin: '4px 0', fontSize: '11px' }}>
                {resumeData.competition.competition_name || ''} | 
                {resumeData.competition.participation_time || ''}
              </p>
            </div>
          )}
        </div>
        
        <div style={{ marginTop: '12px' }}>
          <Space>
            <Button 
              type="primary" 
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(selectedHistory, index)}
            >
              下载 Word 简历 {index + 1}
            </Button>
            <Button 
              type="default" 
              size="small"
              icon={<StarOutlined />}
              onClick={() => handleCollect(selectedHistory)}
            >
              收藏
            </Button>
          </Space>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>简历历史</Title>
      <Paragraph>
        在生成的待选简历中，浏览、选择并命名，作为添加的简历
      </Paragraph>
      
      <Row gutter={24}>
        {/* 左侧历史列表 */}
        <Col span={8}>
          <Card title="生成历史列表" style={{ height: 'fit-content' }}>
            {histories.length === 0 ? (
              <Empty description="暂无简历历史" />
            ) : (
              <List
                dataSource={histories}
                renderItem={(history) => (
                  <List.Item
                    style={{
                      border: '1px solid #d9d9d9',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      padding: '16px',
                      cursor: 'pointer',
                      background: selectedHistory?.id === history.id ? '#f0f8ff' : '#fff'
                    }}
                    onClick={() => setSelectedHistory(history)}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>任务ID: {history.task_id}</Text>
                          {getStatusIcon(history.status)}
                          <Tag color={getStatusColor(history.status)}>
                            {getStatusText(history.status)}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <p>生成类型: {history.generation_type}</p>
                          <p>创建时间: {new Date(history.created_at).toLocaleString()}</p>
                          <p>更新时间: {new Date(history.updated_at).toLocaleString()}</p>
                        </div>
                      }
                    />
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(history);
                      }}
                    >
                      查看详情
                    </Button>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        
        {/* 右侧简历预览 */}
        <Col span={16}>
          <Card title="简历预览">
            {selectedHistory ? (
              <div>
                {selectedHistory.status === 'processing' && (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Progress type="circle" percent={75} />
                    <p style={{ marginTop: '16px' }}>简历正在生成中，请稍候...</p>
                  </div>
                )}
                
                {selectedHistory.status === 'completed' && selectedHistory.resume_data && (
                  <Tabs
                    defaultActiveKey="preview"
                    items={[
                      {
                        key: 'preview',
                        label: '预览',
                        children: (
                          <div style={{ padding: '20px 0' }}>
                            {Array.isArray(selectedHistory.resume_data) ? 
                              selectedHistory.resume_data.map((resume, index) => (
                                <div key={index} style={{ marginBottom: '20px' }}>
                                  <Title level={4}>简历版本 {index + 1}</Title>
                                  <ResumePreview resumeData={resume} />
                                </div>
                              )) : 
                              <ResumePreview resumeData={selectedHistory.resume_data} />
                            }
                          </div>
                        )
                      },
                      {
                        key: 'download',
                        label: '下载',
                        children: (
                          <div style={{ padding: '20px 0' }}>
                            <Row gutter={16}>
                              {Array.isArray(selectedHistory.resume_data) ? 
                                selectedHistory.resume_data.map((resume, index) => (
                                  <Col span={8} key={index}>
                                    {renderResumePreview(resume, index)}
                                  </Col>
                                )) : 
                                renderResumePreview(selectedHistory.resume_data, 0)
                              }
                            </Row>
                          </div>
                        )
                      }
                    ]}
                  />
                )}
                
                {selectedHistory.status === 'failed' && (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <CloseCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />
                    <p style={{ marginTop: '16px', color: '#ff4d4f' }}>简历生成失败</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <FileTextOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                <p style={{ marginTop: '16px', color: '#999' }}>请选择一个简历历史查看详情</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 文件名输入模态框 */}
      <Modal
        title="请输入文件名"
        open={fileNameModalVisible}
        onCancel={() => setFileNameModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setFileNameModalVisible(false)}>
            取消
          </Button>,
          <Button key="confirm" type="primary" onClick={handleSaveResume}>
            确定
          </Button>
        ]}
      >
        <Input
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="请输入文件名"
        />
      </Modal>
    </div>
  );
};

export default ResumeHistory;
