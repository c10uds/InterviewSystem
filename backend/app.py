# -*- coding: utf-8 -*-
"""
主应用文件
整合所有模块，提供Flask应用实例
"""

import logging
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate

from config import (
    SECRET_KEY, SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS,
    LOG_LEVEL, LOG_FORMAT, SPEECH_APPID, SPEECH_API_KEY, SPEECH_API_SECRET
)
from models import db, User, InterviewRecord, Position, ResumeModule, ResumeHistory
from routes import init_routes
from speech_recognition import init_speech_service

from utils import startup_checks

# 配置日志
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format=LOG_FORMAT
)
logger = logging.getLogger(__name__)

def create_app():
    """创建Flask应用"""
    app = Flask(__name__)
    
    # 配置应用
    app.secret_key = SECRET_KEY
    app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS
    
    # 初始化扩展
    CORS(app)
    db.init_app(app)
    Migrate(app, db)
    
    # 初始化路由
    init_routes(app)
    
    # 初始化语音识别服务
    init_speech_service(SPEECH_APPID, SPEECH_API_KEY, SPEECH_API_SECRET)
    
    return app

# 创建应用实例
app = create_app()

if __name__ == '__main__':
    # 启动检查
    if startup_checks():
        logger.info("✅ 应用启动检查通过")
        app.run(debug=True, host='0.0.0.0', port=5000)
    else:
        logger.error("❌ 应用启动检查失败")
        exit(1) 