import React from 'react';
import { TeamOutlined, HistoryOutlined, FileTextOutlined } from '@ant-design/icons';

const sidebarStyle = {
  width: 64,
  minWidth: 64,
  background: '#e3f2fd', // 浅蓝色背景
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  boxShadow: '1px 0 8px 0 rgba(25, 118, 210, 0.04)',
  marginRight: 0,
  padding: '16px 0',
  borderRight: '1px solid #e0e0e0',
  borderRadius: '0 16px 16px 0', // 右侧圆角
};
const iconBtnStyle = active => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  background: active ? '#1976d2' : 'transparent',
  color: active ? '#fff' : '#1976d2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 22,
  marginBottom: 18,
  cursor: 'pointer',
  border: 'none',
  transition: 'background 0.2s',
});

const Sidebar = ({ active, onChange }) => (
  <div style={sidebarStyle}>
    <div style={iconBtnStyle(active === 'interview')} onClick={() => onChange('interview')} title="岗位面试">
      <TeamOutlined />
    </div>
    <div style={iconBtnStyle(active === 'record')} onClick={() => onChange('record')} title="面试记录">
      <HistoryOutlined />
    </div>
    {/* <div style={iconBtnStyle(active === 'doc')} onClick={() => onChange('doc')} title="文档中心">
      <FileTextOutlined />
    </div> */}
  </div>
);
export default Sidebar; 