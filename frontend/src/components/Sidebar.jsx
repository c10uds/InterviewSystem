import React from 'react';
import { FileTextOutlined, HistoryOutlined, TeamOutlined } from '@ant-design/icons';

const sidebarStyle = {
  width: 64,
  background: 'linear-gradient(135deg, #e3f0ff 0%, #b3d8ff 100%)',
  borderRadius: 18,
  padding: '16px 0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  boxShadow: '0 2px 12px 0 rgba(0, 80, 180, 0.08)',
  marginRight: 18
};
const iconBtnStyle = active => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  background: active ? 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)' : '#fff',
  color: active ? '#fff' : '#1976d2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 18,
  fontSize: 22,
  cursor: 'pointer',
  border: 'none',
  boxShadow: active ? '0 2px 8px 0 rgba(25, 118, 210, 0.10)' : 'none',
  transition: 'all 0.2s'
});

const Sidebar = ({ active, onChange }) => (
  <div style={sidebarStyle}>
    <div style={iconBtnStyle(active === 'interview')} onClick={() => onChange('interview')} title="岗位面试">
      <TeamOutlined />
    </div>
    <div style={iconBtnStyle(active === 'record')} onClick={() => onChange('record')} title="面试记录">
      <HistoryOutlined />
    </div>
    <div style={iconBtnStyle(active === 'doc')} onClick={() => onChange('doc')} title="文档中心">
      <FileTextOutlined />
    </div>
  </div>
);

export default Sidebar; 