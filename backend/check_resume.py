#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查数据库中的简历内容
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from app import app
from models import db, User

def check_resume_content():
    """检查数据库中的简历内容"""
    with app.app_context():
        users = User.query.all()
        print(f"总共有 {len(users)} 个用户")
        
        for user in users:
            print(f"\n用户ID: {user.id}")
            print(f"邮箱: {user.email}")
            print(f"姓名: {user.name}")
            print(f"简历文件名: {user.resume_filename}")
            print(f"简历上传时间: {user.resume_upload_time}")
            
            if user.resume_content:
                print(f"简历内容长度: {len(user.resume_content)}")
                print(f"简历内容前100字符: {user.resume_content[:100]}...")
            else:
                print("简历内容: 无")
            
            print("-" * 50)

if __name__ == "__main__":
    check_resume_content() 