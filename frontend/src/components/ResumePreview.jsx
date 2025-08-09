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

// 支持两种尺寸：large(用于页面/放大预览)、small(用于选择弹窗的缩略图)
const ResumePreview = ({ resumeData, size = 'large' }) => {
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
      <div style={{ marginBottom: size === 'small' ? '12px' : '24px' }}>
        <div style={{ textAlign: 'left', marginBottom: size === 'small' ? '8px' : '16px' }}>
          <Title level={size === 'small' ? 4 : 2} style={{ margin: 0, color: '#000', fontWeight: 700 }}>
            {info.name || '姓名'}
          </Title>
          {info.identity && (
            <Text type="secondary" style={{ fontSize: size === 'small' ? '12px' : '14px' }}>
              {info.identity}
            </Text>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: size === 'small' ? '8px' : '12px', color: '#333' }}>
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
          {info.age && size !== 'small' && (
            <Space>
              <UserOutlined />
              <Text>{info.age}岁</Text>
            </Space>
          )}
          {info.address && size !== 'small' && (
            <Space>
              <EnvironmentOutlined />
              <Text>{info.address}</Text>
            </Space>
          )}
          {info.qq && size !== 'small' && (
            <Space>
              <Text>QQ:</Text>
              <Text>{info.qq}</Text>
            </Space>
          )}
          {info.wechat && size !== 'small' && (
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
      <div style={{ marginBottom: size === 'small' ? '12px' : '20px' }}>
        <Title level={size === 'small' ? 5 : 4} style={{ color: '#000', marginBottom: '8px', fontWeight: 700 }}>
          教育经历
        </Title>
        <div style={{ marginBottom: '8px', border: '1px solid #eaeaea', borderRadius: 6, padding: size === 'small' ? 8 : 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong style={{ fontSize: size === 'small' ? '13px' : '16px' }}>{education.school || '学校名称'}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: size === 'small' ? 12 : 14 }}>{education.major || '专业'} | {education.degree || '学历'}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: size === 'small' ? 12 : 14 }}>{education.graduation_date || '毕业时间'}</Text>
              {education.gpa && (
                <div>
                  <Text type="secondary" style={{ fontSize: size === 'small' ? 12 : 14 }}>GPA: {education.gpa}</Text>
                </div>
              )}
            </div>
          </div>
          {education.courses && (
            <div style={{ marginTop: 6 }}>
              <Text type="secondary" style={{ fontSize: size === 'small' ? 12 : 14 }}>相关课程: {education.courses}</Text>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWorkExperience = (work) => {
    if (!work) return null;
    
    return (
      <div style={{ marginBottom: size === 'small' ? '12px' : '20px' }}>
        <Title level={size === 'small' ? 5 : 4} style={{ color: '#000', marginBottom: '8px', fontWeight: 700 }}>
          工作经历
        </Title>
        <div style={{ marginBottom: '8px', border: '1px solid #eaeaea', borderRadius: 6, padding: size === 'small' ? 8 : 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: size === 'small' ? '13px' : '16px' }}>{work.company || '公司名称'}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: size === 'small' ? 12 : 14 }}>{work.position || '职位'}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: size === 'small' ? 12 : 14 }}>
                {work.start_date || '开始时间'} - {work.end_date || '结束时间'}
              </Text>
            </div>
          </div>
          {work.description && (
            <div style={{ marginTop: 6 }}>
              <Text style={{ fontSize: size === 'small' ? 12 : 14 }}>{work.description}</Text>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProjectExperience = (project) => {
    if (!project) return null;
    
    return (
      <div style={{ marginBottom: size === 'small' ? '12px' : '20px' }}>
        <Title level={size === 'small' ? 5 : 4} style={{ color: '#000', marginBottom: '8px', fontWeight: 700 }}>
          项目经历
        </Title>
        <div style={{ marginBottom: '8px', border: '1px solid #eaeaea', borderRadius: 6, padding: size === 'small' ? 8 : 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: size === 'small' ? '13px' : '16px' }}>{project.project_name || '项目名称'}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: size === 'small' ? 12 : 14 }}>担任角色: {project.role || '角色'}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: size === 'small' ? 12 : 14 }}>
                {project.start_date || '开始时间'} - {project.end_date || '结束时间'}
              </Text>
            </div>
          </div>
          {project.description && (
            <div style={{ marginTop: 6 }}>
              <Text style={{ fontSize: size === 'small' ? 12 : 14 }}>{project.description}</Text>
            </div>
          )}
          {project.technologies && (
            <div style={{ marginTop: 6 }}>
              <Text type="secondary" style={{ fontSize: size === 'small' ? 12 : 14 }}>使用技术: {project.technologies}</Text>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCompetition = (competition) => {
    if (!competition) return null;
    
    return (
      <div style={{ marginBottom: size === 'small' ? '12px' : '20px' }}>
        <Title level={size === 'small' ? 5 : 4} style={{ color: '#000', marginBottom: '8px', fontWeight: 700 }}>
          竞赛经历
        </Title>
        <div style={{ marginBottom: '8px', border: '1px solid #eaeaea', borderRadius: 6, padding: size === 'small' ? 8 : 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: size === 'small' ? '13px' : '16px' }}>{competition.competition_name || '竞赛名称'}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: size === 'small' ? 12 : 14 }}>{competition.participation_time || '参与时间'}</Text>
            </div>
          </div>
          {competition.detailed_content && (
            <div style={{ marginTop: 6 }}>
              <Text style={{ fontSize: size === 'small' ? 12 : 14 }}>{competition.detailed_content}</Text>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSkills = (skills) => {
    if (!skills) return null;
    
    return (
      <div style={{ marginBottom: size === 'small' ? '12px' : '20px' }}>
        <Title level={size === 'small' ? 5 : 4} style={{ color: '#000', marginBottom: '8px', fontWeight: 700 }}>
          技能特长
        </Title>
        <div style={{ marginBottom: '8px', border: '1px solid #eaeaea', borderRadius: 6, padding: size === 'small' ? 8 : 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: size === 'small' ? '13px' : '16px' }}>{skills.skill_name || '技能名称'}</Text>
              <br />
              <Tag color="blue" style={{ fontSize: size === 'small' ? 10 : 12, padding: size === 'small' ? '0 6px' : '2px 8px' }}>{skills.proficiency || '熟练程度'}</Tag>
            </div>
          </div>
          {skills.description && (
            <div style={{ marginTop: 6 }}>
              <Text style={{ fontSize: size === 'small' ? 12 : 14 }}>{skills.description}</Text>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCertificates = (certificates) => {
    if (!certificates) return null;
    
    return (
      <div style={{ marginBottom: size === 'small' ? '12px' : '20px' }}>
        <Title level={size === 'small' ? 5 : 4} style={{ color: '#000', marginBottom: '8px', fontWeight: 700 }}>
          荣誉证书
        </Title>
        <div style={{ marginBottom: '8px', border: '1px solid #eaeaea', borderRadius: 6, padding: size === 'small' ? 8 : 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: size === 'small' ? '13px' : '16px' }}>{certificates.certificate_name || '证书名称'}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: size === 'small' ? 12 : 14 }}>颁发机构: {certificates.issuing_organization || '颁发机构'}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: size === 'small' ? 12 : 14 }}>{certificates.issue_date || '颁发时间'}</Text>
            </div>
          </div>
          {certificates.description && (
            <div style={{ marginTop: 6 }}>
              <Text style={{ fontSize: size === 'small' ? 12 : 14 }}>{certificates.description}</Text>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      background: '#fff', 
      padding: size === 'small' ? '12px' : '24px', 
      borderRadius: '6px',
      border: '1px solid #eaeaea',
      maxWidth: size === 'small' ? '100%' : '800px',
      margin: size === 'small' ? 0 : '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      {renderPersonalInfo(resumeData.personal_info)}
      {size !== 'small' && <Divider />}
      
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
