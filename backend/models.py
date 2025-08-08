# -*- coding: utf-8 -*-
"""
数据库模型
包含所有数据库表定义
"""

from flask_sqlalchemy import SQLAlchemy
import datetime

db = SQLAlchemy()

class User(db.Model):
    """用户模型"""
    __tablename__ = 'user'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(512), nullable=False)
    name = db.Column(db.String(64))
    phone = db.Column(db.String(32))
    school = db.Column(db.String(64))
    grade = db.Column(db.String(32))
    target_position = db.Column(db.String(64))
    is_admin = db.Column(db.Boolean, default=False)
    avatar = db.Column(db.String(256), default=None)
    resume_content = db.Column(db.Text, default=None)
    resume_filename = db.Column(db.String(256), default=None)
    resume_upload_time = db.Column(db.DateTime, default=None)

    def check_password(self, password):
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'phone': self.phone,
            'school': self.school,
            'grade': self.grade,
            'target_position': self.target_position,
            'is_admin': self.is_admin,
            'avatar': self.avatar,
            'resume_content': self.resume_content,
            'resume_filename': self.resume_filename,
            'resume_upload_time': self.resume_upload_time.isoformat() if self.resume_upload_time else None,
            'interview_count': len(self.interview_records) if hasattr(self, 'interview_records') else 0
        }
    
class Position(db.Model):
    """职位模型"""
    __tablename__ = 'position'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class InterviewRecord(db.Model):
    """面试记录模型"""
    __tablename__ = 'interview_record'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    position = db.Column(db.String(64))
    questions = db.Column(db.Text)  # json.dumps(list)
    answers = db.Column(db.Text)    # json.dumps(list)
    audio_urls = db.Column(db.Text) # json.dumps(list)
    result = db.Column(db.Text)     # json.dumps(dict)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # 添加用户关系
    user = db.relationship('User', backref='interview_records')

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'user_id': self.user_id,
            'position': self.position,
            'questions': json.loads(self.questions) if self.questions else [],
            'answers': json.loads(self.answers) if self.answers else [],
            'audio_urls': json.loads(self.audio_urls) if self.audio_urls else [],
            'result': json.loads(self.result) if self.result else {},
            'created_at': self.created_at.isoformat()
        }

class ResumeModule(db.Model):
    """简历模块模型"""
    __tablename__ = 'resume_module'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    module_type = db.Column(db.String(64), nullable=False)  # 模块类型：个人简介、教育经历、工作经历等
    module_name = db.Column(db.String(128), nullable=False)  # 模块名称
    content = db.Column(db.Text)  # JSON格式存储模块内容
    order_index = db.Column(db.Integer, default=0)  # 排序索引
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 添加用户关系
    user = db.relationship('User', backref='resume_modules')

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'user_id': self.user_id,
            'module_type': self.module_type,
            'module_name': self.module_name,
            'content': json.loads(self.content) if self.content else {},
            'order_index': self.order_index,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class ResumeHistory(db.Model):
    """简历历史模型"""
    __tablename__ = 'resume_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    task_id = db.Column(db.String(64), unique=True, nullable=False)  # 任务ID
    generation_type = db.Column(db.String(64), default='auto')  # 生成类型：auto/manual
    status = db.Column(db.String(32), default='processing')  # 状态：processing/completed/failed
    resume_data = db.Column(db.Text)  # JSON格式存储简历数据
    file_name = db.Column(db.String(256))  # 文件名
    file_path = db.Column(db.String(512))  # 文件路径
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 添加用户关系
    user = db.relationship('User', backref='resume_histories')

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'user_id': self.user_id,
            'task_id': self.task_id,
            'generation_type': self.generation_type,
            'status': self.status,
            'resume_data': json.loads(self.resume_data) if self.resume_data else {},
            'file_name': self.file_name,
            'file_path': self.file_path,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        } 