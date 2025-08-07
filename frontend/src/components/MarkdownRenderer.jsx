import React from 'react';
import ReactMarkdown from 'react-markdown';

const MarkdownRenderer = ({ content, style = {} }) => {
  const defaultStyle = {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#333'
  };

  const markdownComponents = {
    h1: ({node, ...props}) => (
      <h1 style={{
        fontSize: '20px', 
        fontWeight: 'bold', 
        margin: '16px 0 8px 0', 
        color: '#1976d2',
        borderBottom: '2px solid #e3f0ff',
        paddingBottom: '4px'
      }} {...props} />
    ),
    h2: ({node, ...props}) => (
      <h2 style={{
        fontSize: '18px', 
        fontWeight: 'bold', 
        margin: '14px 0 6px 0', 
        color: '#1976d2'
      }} {...props} />
    ),
    h3: ({node, ...props}) => (
      <h3 style={{
        fontSize: '16px', 
        fontWeight: 'bold', 
        margin: '12px 0 6px 0', 
        color: '#1976d2'
      }} {...props} />
    ),
    h4: ({node, ...props}) => (
      <h4 style={{
        fontSize: '15px', 
        fontWeight: 'bold', 
        margin: '10px 0 4px 0', 
        color: '#1976d2'
      }} {...props} />
    ),
    p: ({node, ...props}) => (
      <p style={{
        margin: '8px 0', 
        lineHeight: '1.6'
      }} {...props} />
    ),
    ul: ({node, ...props}) => (
      <ul style={{
        margin: '8px 0', 
        paddingLeft: '20px'
      }} {...props} />
    ),
    ol: ({node, ...props}) => (
      <ol style={{
        margin: '8px 0', 
        paddingLeft: '20px'
      }} {...props} />
    ),
    li: ({node, ...props}) => (
      <li style={{
        margin: '4px 0', 
        lineHeight: '1.5'
      }} {...props} />
    ),
    strong: ({node, ...props}) => (
      <strong style={{
        fontWeight: 'bold', 
        color: '#333'
      }} {...props} />
    ),
    em: ({node, ...props}) => (
      <em style={{
        fontStyle: 'italic', 
        color: '#666'
      }} {...props} />
    ),
    code: ({node, ...props}) => (
      <code style={{
        background: '#f0f0f0', 
        padding: '2px 4px', 
        borderRadius: '3px', 
        fontSize: '13px', 
        fontFamily: 'monospace'
      }} {...props} />
    ),
    pre: ({node, ...props}) => (
      <pre style={{
        background: '#f5f5f5', 
        padding: '12px', 
        borderRadius: '6px', 
        overflow: 'auto', 
        fontSize: '13px', 
        lineHeight: '1.4',
        border: '1px solid #e0e0e0'
      }} {...props} />
    ),
    blockquote: ({node, ...props}) => (
      <blockquote style={{
        borderLeft: '4px solid #1976d2', 
        margin: '12px 0', 
        padding: '8px 16px', 
        background: '#f8f9fa', 
        color: '#666'
      }} {...props} />
    ),
    hr: ({node, ...props}) => (
      <hr style={{
        border: 'none', 
        borderTop: '1px solid #e0e0e0', 
        margin: '16px 0'
      }} {...props} />
    ),
    table: ({node, ...props}) => (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        margin: '12px 0',
        border: '1px solid #e0e0e0'
      }} {...props} />
    ),
    th: ({node, ...props}) => (
      <th style={{
        padding: '8px 12px',
        border: '1px solid #e0e0e0',
        background: '#f5f5f5',
        fontWeight: 'bold',
        textAlign: 'left'
      }} {...props} />
    ),
    td: ({node, ...props}) => (
      <td style={{
        padding: '8px 12px',
        border: '1px solid #e0e0e0'
      }} {...props} />
    )
  };

  return (
    <div style={{ ...defaultStyle, ...style }}>
      <ReactMarkdown components={markdownComponents}>
        {content || ''}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer; 