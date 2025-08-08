import React from 'react';
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

const IconTest = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h3>图标测试</h3>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <UserOutlined />
        <MailOutlined />
        <PhoneOutlined />
        <EnvironmentOutlined />
        <CalendarOutlined />
        <TrophyOutlined />
        <BookOutlined />
        <BankOutlined />
        <CodeOutlined />
        <StarOutlined />
        <TeamOutlined />
      </div>
    </div>
  );
};

export default IconTest;
