import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Menu, 
  Card, 
  Statistic, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Switch, 
  Space, 
  message,
  Row,
  Col,
  Tag,
  Popconfirm
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ProjectOutlined,
  CommentOutlined,
  LogoutOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  UserSwitchOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Header, Sider, Content } = Layout;
const { TextArea } = Input;

const AdminPanel = ({ onLogout, onBack }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  
  // 统计数据
  const [stats, setStats] = useState({});
  
  // 用户管理
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // 岗位管理
  const [positions, setPositions] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionModalVisible, setPositionModalVisible] = useState(false);
  const [positionForm] = Form.useForm();
  
  // 面试记录
  const [interviews, setInterviews] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [interviewDetailVisible, setInterviewDetailVisible] = useState(false);
  const [currentInterview, setCurrentInterview] = useState(null);

  // API请求基础函数
  const apiRequest = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      }
    };
    
    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    try {
      const response = await axios(url, finalOptions);
      
      if (response.status === 401 || response.status === 403) {
        message.error('登录已过期或权限不足');
        localStorage.removeItem('token');
        onLogout();
        return null;
      }
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        message.error('登录已过期或权限不足');
        localStorage.removeItem('token');
        onLogout();
        return null;
      }
      message.error('网络请求失败，请稍后重试');
      return null;
    }
  };

  // 加载统计数据
  const loadStats = async () => {
    const data = await apiRequest('/api/admin/stats');
    if (data && data.success) {
      setStats(data.stats);
    }
  };

  // 加载用户列表
  const loadUsers = async () => {
    setUsersLoading(true);
    const data = await apiRequest('/api/admin/users');
    if (data && data.success) {
      setUsers(data.users);
    }
    setUsersLoading(false);
  };

  // 加载岗位列表
  const loadPositions = async () => {
    setPositionsLoading(true);
    const data = await apiRequest('/api/admin/positions');
    if (data && data.success) {
      setPositions(data.positions);
    }
    setPositionsLoading(false);
  };

  // 加载面试记录
  const loadInterviews = async () => {
    setInterviewsLoading(true);
    const data = await apiRequest('/api/admin/interviews');
    if (data && data.success) {
      setInterviews(data.interviews);
    }
    setInterviewsLoading(false);
  };

  // 切换管理员权限
  const toggleAdmin = async (userId, setAdmin) => {
    const data = await apiRequest(`/api/admin/users/${userId}`, {
      method: 'PUT',
      data: { is_admin: setAdmin }
    });

    if (data && data.success) {
      message.success('操作成功');
      loadUsers();
    } else {
      message.error(data?.msg || '操作失败');
    }
  };

  // 删除用户
  const deleteUser = async (userId) => {
    const data = await apiRequest(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });

    if (data && data.success) {
      message.success('删除成功');
      loadUsers();
      loadStats(); // 刷新统计数据
    } else {
      message.error(data?.msg || '删除失败');
    }
  };

  // 新增岗位
  const addPosition = async (values) => {
    const data = await apiRequest('/api/admin/positions', {
      method: 'POST',
      data: values
    });

    if (data && data.success) {
      message.success('新增成功');
      setPositionModalVisible(false);
      positionForm.resetFields();
      loadPositions();
      loadStats(); // 刷新统计数据
    } else {
      message.error(data?.msg || '新增失败');
    }
  };

  // 切换岗位状态
  const togglePositionStatus = async (positionId, isActive) => {
    const data = await apiRequest(`/api/admin/positions/${positionId}`, {
      method: 'PUT',
      data: { is_active: isActive }
    });

    if (data && data.success) {
      message.success(`${isActive ? '上架' : '下架'}成功`);
      loadPositions();
      loadStats(); // 刷新统计数据
    } else {
      message.error(data?.msg || `${isActive ? '上架' : '下架'}失败`);
    }
  };

  // 删除岗位
  const deletePosition = async (positionId) => {
    const data = await apiRequest(`/api/admin/positions/${positionId}`, {
      method: 'DELETE'
    });

    if (data && data.success) {
      message.success('删除成功');
      loadPositions();
      loadStats(); // 刷新统计数据
    } else {
      message.error(data?.msg || '删除失败');
    }
  };

  // 查看面试详情
  const viewInterviewDetail = async (interviewId) => {
    const data = await apiRequest(`/api/admin/interviews/${interviewId}`);
    if (data && data.success) {
      setCurrentInterview(data.interview);
      setInterviewDetailVisible(true);
    } else {
      message.error(data?.msg || '获取详情失败');
    }
  };

  // 初始化数据
  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (currentTab === 'users') {
      loadUsers();
    } else if (currentTab === 'positions') {
      loadPositions();
    } else if (currentTab === 'interviews') {
      loadInterviews();
    }
  }, [currentTab]);

  // 菜单项
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '数据统计'
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: '用户管理'
    },
    {
      key: 'positions',
      icon: <ProjectOutlined />,
      label: '岗位管理'
    },
    {
      key: 'interviews',
      icon: <CommentOutlined />,
      label: '面试记录'
    }
  ];

  // 用户表格列
  const userColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text) => text || '未设置'
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => text || '未设置'
    },
    {
      title: '学校',
      dataIndex: 'school',
      key: 'school',
      render: (text) => text || '未设置'
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      render: (text) => text || '未设置'
    },
    {
      title: '目标岗位',
      dataIndex: 'target_position',
      key: 'target_position',
      render: (text) => text || '未设置'
    },
    {
      title: '管理员',
      dataIndex: 'is_admin',
      key: 'is_admin',
      render: (isAdmin) => (
        <Tag color={isAdmin ? 'green' : 'default'}>
          {isAdmin ? '是' : '否'}
        </Tag>
      )
    },
    {
      title: '面试次数',
      dataIndex: 'interview_count',
      key: 'interview_count'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<UserSwitchOutlined />}
            onClick={() => toggleAdmin(record.id, !record.is_admin)}
          >
            {record.is_admin ? '取消管理员' : '设为管理员'}
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            description="删除后不可恢复！"
            onConfirm={() => deleteUser(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 岗位表格列
  const positionColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '岗位名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '无描述'
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '上架' : '下架'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString()
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (text) => new Date(text).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => togglePositionStatus(record.id, !record.is_active)}
          >
            {record.is_active ? '下架' : '上架'}
          </Button>
          <Popconfirm
            title="确定要删除这个岗位吗？"
            description="删除后不可恢复！"
            onConfirm={() => deletePosition(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 面试记录表格列
  const interviewColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name'
    },
    {
      title: '邮箱',
      dataIndex: 'user_email',
      key: 'user_email'
    },
    {
      title: '岗位',
      dataIndex: 'position',
      key: 'position'
    },
    {
      title: '问题数',
      dataIndex: 'questions_count',
      key: 'questions_count'
    },
    {
      title: '回答数',
      dataIndex: 'answers_count',
      key: 'answers_count'
    },
    {
      title: '面试时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => viewInterviewDetail(record.id)}
        >
          查看详情
        </Button>
      )
    }
  ];

  // 渲染内容区域
  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="总用户数"
                    value={stats.user_count || 0}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="管理员数"
                    value={stats.admin_count || 0}
                    prefix={<UserSwitchOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="面试记录"
                    value={stats.interview_count || 0}
                    prefix={<CommentOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="在线岗位"
                    value={`${stats.active_position_count || 0}/${stats.position_count || 0}`}
                    prefix={<ProjectOutlined />}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
            </Row>
            <Card title="系统概览" style={{ marginBottom: 24 }}>
              <p style={{ color: '#666', fontSize: 16 }}>
                系统运行状态良好，所有服务正常。
              </p>
            </Card>
          </div>
        );

      case 'users':
        return (
          <Card 
            title="用户管理" 
            extra={
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadUsers}
                loading={usersLoading}
              >
                刷新
              </Button>
            }
          >
            <Table
              columns={userColumns}
              dataSource={users}
              rowKey="id"
              loading={usersLoading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
          </Card>
        );

      case 'positions':
        return (
          <Card 
            title="岗位管理" 
            extra={
              <Space>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setPositionModalVisible(true)}
                >
                  新增岗位
                </Button>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadPositions}
                  loading={positionsLoading}
                >
                  刷新
                </Button>
              </Space>
            }
          >
            <Table
              columns={positionColumns}
              dataSource={positions}
              rowKey="id"
              loading={positionsLoading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
          </Card>
        );

      case 'interviews':
        return (
          <Card 
            title="面试记录" 
            extra={
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadInterviews}
                loading={interviewsLoading}
              >
                刷新
              </Button>
            }
          >
            <Table
              columns={interviewColumns}
              dataSource={interviews}
              rowKey="id"
              loading={interviewsLoading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div style={{ 
          height: 64, 
          padding: '16px', 
          color: 'white', 
          textAlign: 'center',
          fontSize: collapsed ? 16 : 18,
          fontWeight: 'bold'
        }}>
          {collapsed ? '管理' : '管理员后台'}
        </div>
        <Menu 
          theme="dark" 
          mode="inline" 
          selectedKeys={[currentTab]}
          onClick={({ key }) => setCurrentTab(key)}
          items={menuItems}
        />
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          <Button 
            type="primary" 
            danger 
            block 
            icon={<LogoutOutlined />}
            onClick={() => {
              Modal.confirm({
                title: '确定要退出登录吗？',
                onOk: () => {
                  localStorage.removeItem('token');
                  onLogout();
                }
              });
            }}
          >
            {collapsed ? '' : '退出登录'}
          </Button>
        </div>
      </Sider>

      <Layout>
        <Header style={{ 
          padding: '0 24px', 
          background: '#fff', 
          boxShadow: '0 2px 8px #f0f1f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />}
              onClick={onBack}
              style={{ color: '#1890ff' }}
            >
              返回主界面
            </Button>
            <h2 style={{ margin: 0, color: '#1890ff' }}>
              面试系统管理员后台
            </h2>
          </div>
        </Header>
        
        <Content style={{ 
          margin: '24px 16px', 
          padding: 24, 
          background: '#f0f2f5',
          minHeight: 'calc(100vh - 112px)'
        }}>
          {renderContent()}
        </Content>
      </Layout>

      {/* 新增岗位模态框 */}
      <Modal
        title="新增岗位"
        open={positionModalVisible}
        onOk={() => positionForm.submit()}
        onCancel={() => {
          setPositionModalVisible(false);
          positionForm.resetFields();
        }}
        destroyOnClose
      >
        <Form
          form={positionForm}
          layout="vertical"
          onFinish={addPosition}
        >
          <Form.Item
            label="岗位名称"
            name="name"
            rules={[{ required: true, message: '请输入岗位名称' }]}
          >
            <Input placeholder="请输入岗位名称" />
          </Form.Item>
          <Form.Item
            label="岗位描述"
            name="description"
          >
            <TextArea rows={4} placeholder="请输入岗位描述" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 面试详情模态框 */}
      <Modal
        title="面试记录详情"
        open={interviewDetailVisible}
        onCancel={() => setInterviewDetailVisible(false)}
        footer={null}
        width={800}
      >
        {currentInterview && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <p><strong>用户姓名：</strong>{currentInterview.user_name}</p>
                  <p><strong>用户邮箱：</strong>{currentInterview.user_email}</p>
                </Col>
                <Col span={12}>
                  <p><strong>应聘岗位：</strong>{currentInterview.position}</p>
                  <p><strong>面试时间：</strong>{new Date(currentInterview.created_at).toLocaleString()}</p>
                </Col>
              </Row>
            </Card>

            <Card title="问答内容" size="small" style={{ marginBottom: 16 }}>
              {currentInterview.questions?.map((question, index) => (
                <div key={index} style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 6 }}>
                  <p><strong>Q{index + 1}:</strong> {question}</p>
                  <p><strong>A{index + 1}:</strong> {currentInterview.answers?.[index] || '未回答'}</p>
                </div>
              ))}
            </Card>

            {currentInterview.result?.abilities && (
              <Card title="评测结果" size="small">
                <Row gutter={16}>
                  {Object.entries(currentInterview.result.abilities).map(([ability, score]) => (
                    <Col span={12} key={ability} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{ability}:</span>
                        <Tag color="blue">{score}分</Tag>
                      </div>
                    </Col>
                  ))}
                </Row>
                {currentInterview.result.suggestions && (
                  <div style={{ marginTop: 16 }}>
                    <h4>建议：</h4>
                    <ul>
                      {currentInterview.result.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default AdminPanel;
