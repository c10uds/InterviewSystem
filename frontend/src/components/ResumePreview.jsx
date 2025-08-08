import React from 'react';
import { Card, Typography, Divider, Tag, Space } from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  TrophyOutlined,
  BookOutlined,
  BankOutlined,
  CodeOutlined,
  StarOutlined,
  TeamOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const ResumePreview = ({ resumeData }) => {
  if (!resumeData) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
        <BookOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
        <p>暂无简历数据，请先添加简历模块</p>
      </div>
    );
  }

  const renderPersonalInfo = (info) => {
    if (!info) return null;
    
    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            {info.name || '姓名'}
          </Title>
          <Text type="secondary" style={{ fontSize: '16px' }}>
            {info.identity || '身份'}
          </Text>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '16px' }}>
          {info.phone && (
            <Space>
              <PhoneOutlined />
              <Text>{info.phone}</Text>
            </Space>
          )}
          {info.email && (
            <Space>
              <MailOutlined />
              <Text>{info.email}</Text>
            </Space>
          )}
          {info.age && (
            <Space>
              <UserOutlined />
              <Text>{info.age}岁</Text>
            </Space>
          )}
          {info.address && (
            <Space>
              <EnvironmentOutlined />
              <Text>{info.address}</Text>
            </Space>
          )}
          {info.qq && (
            <Space>
              <Text>QQ:</Text>
              <Text>{info.qq}</Text>
            </Space>
          )}
          {info.wechat && (
            <Space>
              <Text>微信:</Text>
              <Text>{info.wechat}</Text>
            </Space>
          )}
        </div>
      </div>
    );
  };

  const renderEducation = (education) => {
    if (!education) return null;
    
    return (
      <div style={{ marginBottom: '24px' }}>
        <Title level={4} style={{ color: '#1890ff', marginBottom: '12px' }}>
          <BookOutlined style={{ marginRight: '8px' }} />
          教育经历
        </Title>
        <Card size="small" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong style={{ fontSize: '16px' }}>{education.school || '学校名称'}</Text>
              <br />
              <Text type="secondary">{education.major || '专业'} | {education.degree || '学历'}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary">{education.graduation_date || '毕业时间'}</Text>
              {education.gpa && (
                <div>
                  <Text type="secondary">GPA: {education.gpa}</Text>
                </div>
              )}
            </div>
          </div>
          {education.courses && (
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">相关课程: {education.courses}</Text>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderWorkExperience = (work) => {
    if (!work) return null;
    
    return (
      <div style={{ marginBottom: '24px' }}>
        <Title level={4} style={{ color: '#1890ff', marginBottom: '12px' }}>
          <TeamOutlined style={{ marginRight: '8px' }} />
          工作经历
        </Title>
        <Card size="small" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: '16px' }}>{work.company || '公司名称'}</Text>
              <br />
              <Text type="secondary">{work.position || '职位'}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary">
                {work.start_date || '开始时间'} - {work.end_date || '结束时间'}
              </Text>
            </div>
          </div>
          {work.description && (
            <div style={{ marginTop: '8px' }}>
              <Text>{work.description}</Text>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderProjectExperience = (project) => {
    if (!project) return null;
    
    return (
      <div style={{ marginBottom: '24px' }}>
        <Title level={4} style={{ color: '#1890ff', marginBottom: '12px' }}>
          <CodeOutlined style={{ marginRight: '8px' }} />
          项目经历
        </Title>
        <Card size="small" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: '16px' }}>{project.project_name || '项目名称'}</Text>
              <br />
              <Text type="secondary">担任角色: {project.role || '角色'}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary">
                {project.start_date || '开始时间'} - {project.end_date || '结束时间'}
              </Text>
            </div>
          </div>
          {project.description && (
            <div style={{ marginTop: '8px' }}>
              <Text>{project.description}</Text>
            </div>
          )}
          {project.technologies && (
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">使用技术: {project.technologies}</Text>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderCompetition = (competition) => {
    if (!competition) return null;
    
    return (
      <div style={{ marginBottom: '24px' }}>
        <Title level={4} style={{ color: '#1890ff', marginBottom: '12px' }}>
          <TrophyOutlined style={{ marginRight: '8px' }} />
          竞赛经历
        </Title>
        <Card size="small" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: '16px' }}>{competition.competition_name || '竞赛名称'}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary">{competition.participation_time || '参与时间'}</Text>
            </div>
          </div>
          {competition.detailed_content && (
            <div style={{ marginTop: '8px' }}>
              <Text>{competition.detailed_content}</Text>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderSkills = (skills) => {
    if (!skills) return null;
    
    return (
      <div style={{ marginBottom: '24px' }}>
        <Title level={4} style={{ color: '#1890ff', marginBottom: '12px' }}>
          <StarOutlined style={{ marginRight: '8px' }} />
          技能特长
        </Title>
        <Card size="small" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: '16px' }}>{skills.skill_name || '技能名称'}</Text>
              <br />
              <Tag color="blue">{skills.proficiency || '熟练程度'}</Tag>
            </div>
          </div>
          {skills.description && (
            <div style={{ marginTop: '8px' }}>
              <Text>{skills.description}</Text>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderCertificates = (certificates) => {
    if (!certificates) return null;
    
    return (
      <div style={{ marginBottom: '24px' }}>
        <Title level={4} style={{ color: '#1890ff', marginBottom: '12px' }}>
          <TrophyOutlined style={{ marginRight: '8px' }} />
          荣誉证书
        </Title>
        <Card size="small" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: '16px' }}>{certificates.certificate_name || '证书名称'}</Text>
              <br />
              <Text type="secondary">颁发机构: {certificates.issuing_organization || '颁发机构'}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary">{certificates.issue_date || '颁发时间'}</Text>
            </div>
          </div>
          {certificates.description && (
            <div style={{ marginTop: '8px' }}>
              <Text>{certificates.description}</Text>
            </div>
          )}
        </Card>
      </div>
    );
  };

  return (
    <div style={{ 
      background: '#fff', 
      padding: '24px', 
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      {renderPersonalInfo(resumeData.personal_info)}
      
      <Divider />
      
      {renderEducation(resumeData.education)}
      {renderWorkExperience(resumeData.work_experience)}
      {renderProjectExperience(resumeData.project_experience)}
      {renderCompetition(resumeData.competition)}
      {renderSkills(resumeData.skills)}
      {renderCertificates(resumeData.certificates)}
    </div>
  );
};

export default ResumePreview;
