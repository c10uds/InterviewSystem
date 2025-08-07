# -*- coding: utf-8 -*-
"""
配置文件
包含所有配置和常量
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Flask配置
SECRET_KEY = 'your_secret_key'

# JWT配置
JWT_SECRET = os.getenv('JWT_SECRET', 'your_jwt_secret_key_here')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')

# 数据库配置
SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI', 'mysql+pymysql://root:123qwe@localhost/interview_demo')
SQLALCHEMY_TRACK_MODIFICATIONS = False

# AI服务配置
AI_BASE_URL = os.getenv('AI_BASE_URL', 'http://127.0.0.1:8081')

# 大模型API配置
SPARK_APPID = os.getenv('SPARK_APPID', '82e7fa93')
SPARK_API_SECRET = os.getenv('SPARK_API_SECRET', 'ZDc4NjkyMjVhOGRlYWJiYmM3OWM1NDgy')
# 注意：WebSocket调用需要纯API密钥，不包含Bearer前缀
SPARK_API_KEY = os.getenv('SPARK_API_KEY', 'zMLoPwAeWWhtAEIAqvji:OwxygZjXqKOMReSvPJTi')

# 语音识别API配置
SPEECH_APPID = os.getenv('SPEECH_APPID', '82e7fa93')
SPEECH_API_SECRET = os.getenv('SPEECH_API_SECRET', 'ZDc4NjkyMjVhOGRlYWJiYmM3OWM1NDgy')
SPEECH_API_KEY = os.getenv('SPEECH_API_KEY', '891ffce5b4b74fd82c3dbb65203c7614')

# 人脸特征分析API配置
FACE_APPID = os.getenv('FACE_APPID', '82e7fa93')
FACE_API_KEY = os.getenv('FACE_API_KEY', '891ffce5b4b74fd82c3dbb65203c7614')
FACE_EXPRESSION_URL = "http://tupapi.xfyun.cn/v1/expression"

# 大模型API URLs
SPARK_IMAGE_URL = "wss://spark-api.cn-huabei-1.xf-yun.com/v2.1/image"
SPARK_ASR_URL = "ws://sparkos.xfyun.cn/v1/openapi/chat"
SPARK_HTTP_URL = "https://spark-api-open.xf-yun.com/v1/chat/completions"

# 文件上传配置
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 日志配置
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

# 面试相关配置
DEFAULT_POSITIONS = [
    "软件工程师", "前端开发", "后端开发", "全栈开发", 
    "数据科学家", "机器学习工程师", "产品经理", "UI/UX设计师"
]

# 文件大小限制
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB 