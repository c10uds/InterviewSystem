import React from 'react';
import ReactMarkdown from 'react-markdown';

const questionListStyle = {
  width: 320,
  minWidth: 220,
  background: '#fff',
  borderRadius: 18,
  marginRight: 24,
  padding: 24,
  boxSizing: 'border-box',
  boxShadow: '0 2px 12px 0 rgba(0, 80, 180, 0.08)'
};

const QuestionList = ({ questions }) => (
  <div style={questionListStyle}>
    <div style={{ fontSize: 18, fontWeight: 700, color: '#1976d2', marginBottom: 16 }}>面试题目</div>
    {questions && questions.length > 0 ? (
      questions.map((q, i) => (
        <div key={i} style={{ marginBottom: 18, borderRadius: 10, background: '#f7fbff', padding: 12 }}>
          <ReactMarkdown>{q}</ReactMarkdown>
        </div>
      ))
    ) : (
      <div style={{ color: '#888' }}>暂无题目</div>
    )}
  </div>
);

export default QuestionList; 