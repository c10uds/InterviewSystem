import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  message, 
  Space, 
  Divider,
  Modal,
  List,
  Typography,
  Row,
  Col,
  Tabs
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined,
  SaveOutlined,
  DownloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import ResumePreview from './ResumePreview';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const ResumeEditor = () => {
  const [form] = Form.useForm();
  const [modules, setModules] = useState([]);
  const [currentModule, setCurrentModule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [moduleModalVisible, setModuleModalVisible] = useState(false);
  const [moduleForm] = Form.useForm();

  // 模块类型配置
  const moduleTypes = [
    { value: 'personal_info', label: '个人简介', fields: [
      { name: 'name', label: '姓名', type: 'input', required: true },
      { name: 'gender', label: '性别', type: 'select', options: ['男', '女'], required: true },
      { name: 'phone', label: '手机号', type: 'input', required: true },
      { name: 'email', label: '邮箱', type: 'input', required: true },
      { name: 'qq', label: 'QQ', type: 'input' },
      { name: 'wechat', label: '微信', type: 'input' },
      { name: 'address', label: '居住地', type: 'input' },
      { name: 'age', label: '年龄', type: 'input' },
      { name: 'identity', label: '当前身份', type: 'select', options: ['应届生', '在职', '待业'], required: true }
    ]},
    { value: 'education', label: '教育经历', fields: [
      { name: 'school', label: '学校名称', type: 'input', required: true },
      { name: 'major', label: '专业', type: 'input', required: true },
      { name: 'degree', label: '学历', type: 'select', options: ['本科', '硕士', '博士'], required: true },
      { name: 'graduation_date', label: '毕业时间', type: 'input', required: true },
      { name: 'gpa', label: 'GPA', type: 'input' },
      { name: 'courses', label: '相关课程', type: 'textarea' }
    ]},
    { value: 'work_experience', label: '工作经历', fields: [
      { name: 'company', label: '公司名称', type: 'input', required: true },
      { name: 'position', label: '职位', type: 'input', required: true },
      { name: 'start_date', label: '开始时间', type: 'input', required: true },
      { name: 'end_date', label: '结束时间', type: 'input' },
      { name: 'description', label: '工作描述', type: 'textarea', required: true }
    ]},
    { value: 'project_experience', label: '项目经历', fields: [
      { name: 'project_name', label: '项目名称', type: 'input', required: true },
      { name: 'role', label: '担任角色', type: 'input', required: true },
      { name: 'start_date', label: '开始时间', type: 'input', required: true },
      { name: 'end_date', label: '结束时间', type: 'input' },
      { name: 'description', label: '项目描述', type: 'textarea', required: true },
      { name: 'technologies', label: '使用技术', type: 'textarea' }
    ]},
    { value: 'competition', label: '竞赛经历', fields: [
      { name: 'competition_name', label: '竞赛名称', type: 'input', required: true },
      { name: 'participation_time', label: '参与时间', type: 'input', required: true },
      { name: 'detailed_content', label: '详细内容', type: 'textarea', required: true }
    ]},
    { value: 'skills', label: '技能特长', fields: [
      { name: 'skill_name', label: '技能名称', type: 'input', required: true },
      { name: 'proficiency', label: '熟练程度', type: 'select', options: ['初级', '中级', '高级', '专家'], required: true },
      { name: 'description', label: '技能描述', type: 'textarea' }
    ]},
    { value: 'certificates', label: '荣誉证书', fields: [
      { name: 'certificate_name', label: '证书名称', type: 'input', required: true },
      { name: 'issuing_organization', label: '颁发机构', type: 'input', required: true },
      { name: 'issue_date', label: '颁发时间', type: 'input', required: true },
      { name: 'description', label: '证书描述', type: 'textarea' }
    ]}
  ];

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/resume/modules', {
        headers: { Authorization: token }
      });
      const modules = response.data.modules || [];
      setModules(modules);
      
      // 如果当前没有选中的模块，或者当前选中的模块不在新列表中，选择第一个模块
      if (modules.length > 0 && (!currentModule || !modules.find(m => m.id === currentModule.id))) {
        setCurrentModule(modules[0]);
        form.setFieldsValue(modules[0].content);
      } else if (modules.length === 0) {
        // 如果没有模块，清空当前模块
        setCurrentModule(null);
        form.resetFields();
      }
    } catch (error) {
      message.error('获取模块列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleModuleSelect = (module) => {
    setCurrentModule(module);
    form.setFieldsValue(module.content);
  };

  const handleSaveModule = async (values) => {
    if (!currentModule) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/resume/modules/${currentModule.id}`, {
        content: JSON.stringify(values)
      }, {
        headers: { Authorization: token }
      });
      
      if (response.data.success) {
        message.success('保存成功');
        fetchModules();
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddModule = () => {
    setModuleModalVisible(true);
    moduleForm.resetFields();
  };

  const handleDeleteModule = async (moduleId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/resume/modules/${moduleId}`, {
        headers: { Authorization: token }
      });
      if (response.data.success) {
        message.success('删除成功');
        
        // 如果删除的是当前选中的模块，清空当前模块
        if (currentModule && currentModule.id === moduleId) {
          setCurrentModule(null);
          form.resetFields();
        }
        
        // 重新获取模块列表
        const modulesResponse = await axios.get('/api/resume/modules', {
          headers: { Authorization: token }
        });
        const updatedModules = modulesResponse.data.modules || [];
        setModules(updatedModules);
        
        // 如果还有其他模块，自动选择第一个
        if (updatedModules.length > 0 && (!currentModule || currentModule.id === moduleId)) {
          setCurrentModule(updatedModules[0]);
          form.setFieldsValue(updatedModules[0].content);
        }
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleCreateModule = async (values) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/resume/modules', values, {
        headers: { Authorization: token }
      });
      if (response.data.success) {
        message.success('创建成功');
        setModuleModalVisible(false);
        
        // 重新获取模块列表并切换到新创建的模块
        const modulesResponse = await axios.get('/api/resume/modules', {
          headers: { Authorization: token }
        });
        const updatedModules = modulesResponse.data.modules || [];
        setModules(updatedModules);
        
        // 选择新创建的模块（通常是最后一个）
        if (updatedModules.length > 0) {
          const newModule = updatedModules[updatedModules.length - 1];
          setCurrentModule(newModule);
          form.setFieldsValue(newModule.content);
        }
      }
    } catch (error) {
      message.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateResume = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/resume/generate', {}, {
        headers: { Authorization: token }
      });
      if (response.data.success) {
        message.success('简历生成任务已创建，请查看简历历史');
      }
    } catch (error) {
      message.error('生成失败');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    switch (field.type) {
      case 'input':
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
          >
            <Input placeholder={`请输入${field.label}`} />
          </Form.Item>
        );
      case 'select':
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            rules={field.required ? [{ required: true, message: `请选择${field.label}` }] : []}
          >
            <Select placeholder={`请选择${field.label}`}>
              {field.options.map(option => (
                <Option key={option} value={option}>{option}</Option>
              ))}
            </Select>
          </Form.Item>
        );
      case 'textarea':
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
          >
            <TextArea rows={4} placeholder={`请输入${field.label}`} />
          </Form.Item>
        );
      default:
        return null;
    }
  };

  const getModuleTypeFields = (moduleType) => {
    const moduleTypeConfig = moduleTypes.find(type => type.value === moduleType);
    return moduleTypeConfig ? moduleTypeConfig.fields : [];
  };

  // 生成预览数据（兼容对象或字符串）
  const generatePreviewData = () => {
    const previewData = {};
    modules.forEach((m) => {
      if (!m || !m.content) return;
      let content = m.content;
      try {
        if (typeof content === 'string') {
          content = JSON.parse(content);
        }
      } catch (err) {
        // 保底：如果解析失败，跳过该模块
        console.warn('预览解析失败，已跳过模块:', m.module_type, err);
        return;
      }
      previewData[m.module_type] = content || {};
    });
    return previewData;
  };

  return (
    <div style={{ display: 'flex', height: '100%', gap: '20px' }}>
      {/* 左侧模块列表 */}
      <div style={{ width: '300px', background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
        <Title level={4}>模块列表</Title>
        <List
          dataSource={modules}
          renderItem={(module) => (
            <List.Item
              style={{
                background: currentModule?.id === module.id ? '#e6f7ff' : '#fff',
                borderRadius: '8px',
                marginBottom: '8px',
                cursor: 'pointer',
                padding: '12px'
              }}
              onClick={() => handleModuleSelect(module)}
              actions={[
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteModule(module.id);
                  }}
                />
              ]}
            >
              <List.Item.Meta
                title={module.module_name}
                description={module.module_type}
              />
            </List.Item>
          )}
        />
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddModule}
          style={{ width: '100%', marginTop: '16px' }}
        >
          添加模块
        </Button>
      </div>

      {/* 右侧编辑区域 */}
      <div style={{ flex: 1, background: '#fff', padding: '20px', borderRadius: '8px' }}>
        <Tabs
          defaultActiveKey="edit"
          items={[
            {
              key: 'edit',
              label: '编辑',
              children: (
                <>
                  {currentModule ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <Title level={3}>{currentModule.module_name}</Title>
                        <Space>
                          <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={() => form.submit()}
                            loading={loading}
                          >
                            保存
                          </Button>
                          <Button
                            icon={<DownloadOutlined />}
                            onClick={handleGenerateResume}
                            loading={loading}
                          >
                            生成简历
                          </Button>
                        </Space>
                      </div>
                      
                      <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSaveModule}
                      >
                        <Row gutter={16}>
                          {getModuleTypeFields(currentModule.module_type).map(field => (
                            <Col span={12} key={field.name}>
                              {renderField(field)}
                            </Col>
                          ))}
                        </Row>
                      </Form>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <Text type="secondary">请选择或添加一个模块开始编辑</Text>
                    </div>
                  )}
                </>
              )
            },
            {
              key: 'preview',
              label: (
                <Space>
                  <EyeOutlined />
                  预览
                </Space>
              ),
              children: (
                <div style={{ padding: '20px 0' }}>
                          <ResumePreview resumeData={generatePreviewData()} size="large" />
                </div>
              )
            }
          ]}
        />
      </div>

      {/* 添加模块模态框 */}
      <Modal
        title="添加模块"
        open={moduleModalVisible}
        onCancel={() => setModuleModalVisible(false)}
        footer={null}
      >
        <Form
          form={moduleForm}
          layout="vertical"
          onFinish={handleCreateModule}
        >
          <Form.Item
            name="module_type"
            label="模块类型"
            rules={[{ required: true, message: '请选择模块类型' }]}
          >
            <Select placeholder="请选择模块类型">
              {moduleTypes.map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="module_name"
            label="模块名称"
            rules={[{ required: true, message: '请输入模块名称' }]}
          >
            <Input placeholder="请输入模块名称" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建
              </Button>
              <Button onClick={() => setModuleModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ResumeEditor;
