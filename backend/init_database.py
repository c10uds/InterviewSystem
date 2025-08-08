#!/usr/bin/env python3
"""
数据库初始化脚本
用于创建数据库、表和初始数据
"""

import os
import sys
from dotenv import load_dotenv
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import datetime

# 加载环境变量
load_dotenv()

# 创建Flask应用
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI', 'mysql+pymysql://root:123qwe@localhost/interview_demo')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# 导入模型
from app import User, InterviewRecord, ResumeModule, ResumeHistory

def create_database():
    """创建数据库"""
    try:
        # 从URI中提取数据库名
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        if 'mysql' in db_uri:
            # 解析MySQL URI
            parts = db_uri.split('/')
            if len(parts) >= 4:
                db_name = parts[-1]
                # 创建不包含数据库名的URI
                base_uri = '/'.join(parts[:-1])
                
                # 临时配置，连接到MySQL服务器（不指定数据库）
                temp_app = Flask(__name__)
                temp_app.config['SQLALCHEMY_DATABASE_URI'] = base_uri
                temp_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
                temp_db = SQLAlchemy(temp_app)
                
                with temp_app.app_context():
                    # 创建数据库
                    temp_db.engine.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
                    print(f"✅ 数据库 {db_name} 创建成功")
                
                return True
    except Exception as e:
        print(f"❌ 创建数据库失败: {e}")
        return False

def init_tables():
    """初始化表结构"""
    try:
        with app.app_context():
            # 创建所有表
            db.create_all()
            print("✅ 数据库表创建成功")
            return True
    except Exception as e:
        print(f"❌ 创建表失败: {e}")
        return False

def create_admin_user():
    """创建管理员用户"""
    try:
        with app.app_context():
            # 检查是否已存在管理员用户
            admin = User.query.filter_by(email='admin@example.com').first()
            if admin:
                print("✅ 管理员用户已存在")
                return True
            
            # 创建管理员用户
            admin = User(
                email='admin@example.com',
                password_hash='pbkdf2:sha256:600000$your_salt$your_hash',  # 需要正确生成
                name='管理员',
                phone='13800000000',
                school='系统管理员',
                grade='管理员',
                target_position='系统管理',
                is_admin=True
            )
            
            # 设置密码
            from werkzeug.security import generate_password_hash
            admin.password_hash = generate_password_hash('admin123')
            
            db.session.add(admin)
            db.session.commit()
            
            print("✅ 管理员用户创建成功")
            print("   邮箱: admin@example.com")
            print("   密码: admin123")
            return True
            
    except Exception as e:
        print(f"❌ 创建管理员用户失败: {e}")
        return False

def main():
    """主函数"""
    print("🔧 开始数据库初始化...")
    
    # 1. 创建数据库
    if not create_database():
        print("❌ 数据库初始化失败")
        sys.exit(1)
    
    # 2. 创建表
    if not init_tables():
        print("❌ 表创建失败")
        sys.exit(1)
    
    # 3. 创建管理员用户
    if not create_admin_user():
        print("❌ 管理员用户创建失败")
        sys.exit(1)
    
    print("✅ 数据库初始化完成")
    print("\n📋 下一步操作:")
    print("1. 运行 Flask-Migrate 迁移:")
    print("   flask db init")
    print("   flask db migrate -m 'Initial migration'")
    print("   flask db upgrade")
    print("2. 启动应用:")
    print("   python app.py")

if __name__ == '__main__':
    main() 