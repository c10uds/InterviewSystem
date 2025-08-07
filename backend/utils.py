# -*- coding: utf-8 -*-
"""
工具函数
包含各种辅助函数和工具类
"""

import os
import logging
import subprocess
import tempfile
import requests
import jwt
from functools import wraps
from flask import session, redirect, url_for, request, jsonify

from config import AI_BASE_URL, UPLOAD_FOLDER, JWT_SECRET, JWT_ALGORITHM
from llm_api import chat_manager, ask_llm_with_http

logger = logging.getLogger(__name__)

def login_required(f):
    """登录验证装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({"error": "请先登录"}), 401
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            request.user = payload
        except Exception:
            return jsonify({"error": "token无效或已过期"}), 401
        return f(*args, **kwargs)
    return decorated

def check_database_connection():
    """检查数据库连接是否正常"""
    try:
        from models import db
        from app import app
        with app.app_context():
            with db.engine.connect() as conn:
                conn.execute(db.text('SELECT 1'))
        print("✅ 数据库连接成功")
        return True
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False

def validate_models():
    """验证数据库模型是否正确"""
    try:
        from models import db
        from app import app
        with app.app_context():
            with db.engine.connect() as conn:
                # 检查User表是否存在
                result = conn.execute(db.text("""
                    SELECT COUNT(*) as count 
                    FROM information_schema.tables 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'user'
                """))
                user_table_exists = result.fetchone()[0] > 0
                
                if not user_table_exists:
                    print("❌ User表不存在，请运行数据库迁移")
                    return False
                
                # 检查必要的字段是否存在
                result = conn.execute(db.text("""
                    SELECT COLUMN_NAME 
                    FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'user'
                """))
                columns = [row[0] for row in result.fetchall()]
                
                required_columns = ['id', 'email', 'password_hash', 'name', 'phone', 'school', 'grade', 'target_position', 'is_admin', 'avatar', 'resume_content', 'resume_filename', 'resume_upload_time']
                missing_columns = [col for col in required_columns if col not in columns]
                
                if missing_columns:
                    print(f"❌ User表缺少必要字段: {missing_columns}")
                    print("请运行以下命令进行数据库迁移:")
                    print("  flask db upgrade")
                    return False
                
                # 检查InterviewRecord表是否存在
                result = conn.execute(db.text("""
                    SELECT COUNT(*) as count 
                    FROM information_schema.tables 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'interview_record'
                """))
                record_table_exists = result.fetchone()[0] > 0
            
            if not record_table_exists:
                print("❌ InterviewRecord表不存在，请运行数据库迁移")
                return False
            
            print("✅ 数据库模型验证通过")
            return True
            
    except Exception as e:
        print(f"❌ 模型验证失败: {e}")
        return False

def startup_checks():
    """应用启动时的检查"""
    print("🔍 开始启动检查...")
    
    # 检查数据库连接
    if not check_database_connection():
        print("💡 请检查数据库配置和连接")
        return False
    
    # 检查数据库模型
    if not validate_models():
        print("💡 请运行数据库迁移")
        return False
    
    print("✅ 启动检查完成")
    return True

class CppAISDK:
    """AI服务SDK"""
    def __init__(self, base_url):
        self.base_url = base_url

    def ask_llm(self, prompt, model="spark", chat_id=None):
        """大模型问答，优先使用HTTP API，失败时回退到原有API"""
        try:
            # 首先尝试使用HTTP API
            from config import SPARK_API_KEY
            if SPARK_API_KEY != 'XXXXXXXXXXXXXXXXXXXXXXXX':
                logger.info(f"[ask_llm] 使用HTTP API调用大模型: {prompt[:50]}...")
                
                # 构建消息历史
                if chat_id:
                    # 获取对话历史
                    messages = chat_manager.get_messages(chat_id)
                    # 添加当前用户消息
                    chat_manager.add_message(chat_id, "user", prompt)
                    messages = chat_manager.get_messages(chat_id)
                else:
                    # 单轮对话
                    messages = [{"role": "user", "content": prompt}]
                
                # 使用HTTP API调用
                http_result = ask_llm_with_http(messages)
                if http_result and http_result.get("success"):
                    logger.info(f"[ask_llm] HTTP API调用成功")
                    answer = http_result.get("answer", "")
                    
                    # 如果有chat_id，保存助手回复到对话历史
                    if chat_id and answer:
                        chat_manager.add_message(chat_id, "assistant", answer)
                    
                    return answer
                else:
                    logger.warning(f"[ask_llm] HTTP API调用失败，回退到原有API: {http_result}")
            
            # 回退到原有API
            logger.info(f"[ask_llm] 使用原有API调用: {prompt[:50]}...")
            data = {
                "question": prompt,
                "model": model
            }
            if chat_id:
                data["chat_id"] = chat_id
            logger.info(f"[ask_llm] 请求: {data}")
            
            res = requests.post(f"{self.base_url}/api/llm", data=data)
            res_json = res.json()
            logger.info(f"[ask_llm] 响应: {res_json}")
            if res_json.get("success"):
                return res_json.get("answer", "")
            else:
                return ""
        except Exception as e:
            logger.error(f"[ask_llm] 异常: {e}")
            return ""

    def asr(self, audio_path, language="zh_cn"):
        """语音识别，优先使用大模型API，失败时回退到原有API"""
        import tempfile
        try:
            # 转为绝对路径
            audio_path = os.path.abspath(audio_path)
            
            # 首先尝试使用大模型API
            from config import SPARK_APPID, SPARK_API_SECRET, SPARK_API_KEY
            if SPARK_APPID != 'XXXXXXXX' and SPARK_API_SECRET != 'XXXXXXXXXXXXXXXXXXXXXXXX' and SPARK_API_KEY != 'XXXXXXXXXXXXXXXXXXXXXXXX':
                logger.info(f"[asr] 使用大模型API识别音频: {audio_path}")
                
                # 确保音频格式正确（16k单声道pcm）
                if not audio_path.endswith('.pcm'):
                    # 在UPLOAD_FOLDER下创建临时pcm文件
                    base = os.path.splitext(os.path.basename(audio_path))[0]
                    pcm_path = os.path.abspath(os.path.join(UPLOAD_FOLDER, f"{base}_tmp.pcm"))
                    # ffmpeg转码为16k单声道pcm
                    cmd = [
                        'ffmpeg', '-y', '-i', audio_path,
                        '-f', 's16le', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', pcm_path
                    ]
                    subprocess.run(cmd, check=True)
                else:
                    pcm_path = audio_path
                
                # 使用大模型API识别
                from llm_api import asr_with_llm
                llm_result = asr_with_llm(pcm_path, language)
                if llm_result and llm_result.get("success"):
                    logger.info(f"[asr] 大模型识别成功: {llm_result}")
                    # 清理临时文件
                    if pcm_path != audio_path and os.path.exists(pcm_path):
                        logger.info(f"[asr] 删除临时pcm文件: {pcm_path}")
                        os.remove(pcm_path)
                    return llm_result.get("text", "")
                else:
                    logger.warning(f"[asr] 大模型识别失败，回退到原有API: {llm_result}")
                    # 清理临时文件
                    if pcm_path != audio_path and os.path.exists(pcm_path):
                        os.remove(pcm_path)
            
            # 回退到原有API
            logger.info(f"[asr] 使用原有API识别音频: {audio_path}")
            # 只要不是pcm就转码
            if not audio_path.endswith('.pcm'):
                # 在UPLOAD_FOLDER下创建临时pcm文件
                base = os.path.splitext(os.path.basename(audio_path))[0]
                pcm_path = os.path.abspath(os.path.join(UPLOAD_FOLDER, f"{base}_tmp.pcm"))
                # ffmpeg转码为16k单声道pcm（假设ASR服务需要）
                cmd = [
                    'ffmpeg', '-y', '-i', audio_path,
                    '-f', 's16le', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', pcm_path
                ]
                subprocess.run(cmd, check=True)
            else:
                pcm_path = audio_path
            with open(pcm_path, "rb") as f:
                files = {"audio": f}
                data = {"language": language}
                logger.info(f"[asr] 请求: 文件={pcm_path}, data={data}")
                res = requests.post(f"{self.base_url}/api/asr", files=files, data=data)
            res_json = res.json()
            logger.info(f"[asr] 响应: {res_json}")
            # 清理临时文件
            if pcm_path != audio_path and os.path.exists(pcm_path):
                logger.info(f"[asr] 删除临时pcm文件: {pcm_path}")
                os.remove(pcm_path)
            if res_json.get("success"):
                return res_json.get("text", "")
            else:
                return ""
        except Exception as e:
            logger.error(f"[asr] 异常: {e}")
            return ""

    def tts(self, text, voice="xiaoyan", format="wav"):
        """文本转语音"""
        data = {
            "text": text,
            "voice": voice,
            "format": format
        }
        logger.info(f"[tts] 请求: {data}")
        try:
            res = requests.post(f"{self.base_url}/api/tts", data=data)
            res_json = res.json()
            logger.info(f"[tts] 响应: {res_json}")
            if res_json.get("success"):
                return res_json.get("audio_url", "")
            else:
                return ""
        except Exception as e:
            logger.error(f"[tts] 异常: {e}")
            return ""

    def analyze_image(self, image_path, analysis_type="interview_scene", detect_faces=True, analyze_emotion=True, analyze_micro_expression=False):
        """分析图片，使用官方大模型API进行微表情分析"""
        try:
            # 使用官方大模型API
            from config import SPARK_APPID, SPARK_API_SECRET, SPARK_API_KEY
            if SPARK_APPID != 'XXXXXXXX' and SPARK_API_SECRET != 'XXXXXXXXXXXXXXXXXXXXXXXX' and SPARK_API_KEY != 'XXXXXXXXXXXXXXXXXXXXXXXX':
                logger.info(f"[analyze_image] 使用官方大模型API分析图片: {image_path}")
                
                # 使用讯飞人脸特征分析API
                from llm_api import analyze_image_with_face_expression_api
                llm_result = analyze_image_with_face_expression_api(image_path)
                if llm_result.get("success"):
                    logger.info(f"[analyze_image] 大模型分析成功: {llm_result}")
                    
                    # 解析分析结果，提取微表情信息
                    analysis_text = llm_result.get("analysis", "")
                    
                    # 尝试解析JSON格式的分析结果
                    try:
                        import json
                        analysis_data = json.loads(analysis_text)
                        emotions = analysis_data.get('emotions', {})
                        micro_expressions = analysis_data.get('micro_expressions', {})
                        confidence = analysis_data.get('confidence', 0.8)
                    except:
                        # 如果解析失败，使用默认格式
                        emotions = {"primary_emotion": "analyzed_by_llm", "confidence": 0.8}
                        micro_expressions = {"detected": "analyzed_by_llm", "confidence": 0.8}
                        confidence = 0.8
                    
                    return {
                        "success": True,
                        "analysis": analysis_text,
                        "source": "llm",
                        "emotions": emotions,
                        "micro_expressions": micro_expressions,
                        "confidence": confidence,
                        "analysis_type": "interview_micro_expression"
                    }
                else:
                    logger.warning(f"[analyze_image] 大模型分析失败，回退到原有API: {llm_result}")
            
            # 回退到原有API
            logger.info(f"[analyze_image] 使用原有API分析图片: {image_path}")
            with open(image_path, "rb") as f:
                files = {"image": f}
                data = {
                    "analysis_type": analysis_type,
                    "detect_faces": str(detect_faces).lower(),
                    "analyze_emotion": str(analyze_emotion).lower(),
                    "analyze_micro_expression": str(analyze_micro_expression).lower()
                }
                logger.info(f"[analyze_image] 请求: 文件={image_path}, data={data}")
                res = requests.post(f"{self.base_url}/api/image", files=files, data=data)
            res_json = res.json()
            logger.info(f"[analyze_image] 响应: {res_json}")
            if res_json.get("success"):
                return res_json
            else:
                return {}
        except Exception as e:
            logger.error(f"[analyze_image] 异常: {e}")
            return {}

# 全局AI SDK实例 - 已替换为WebSocket调用
# cpp_sdk = CppAISDK(AI_BASE_URL)

def next_question(position, questions, answers, chat_id=None):
    """生成下一个面试问题"""
    logger.info(f"[next_question] position={position}, questions={questions}, answers={answers}, chat_id={chat_id}")
    
    # 使用WebSocket调用大模型
    from llm_api import ask_llm_with_http
    
    if not questions:
        prompt = f"你是{position}岗位的面试官，请给出第一个面试问题。请只用一句话返回问题内容，不要有多余解释。"
        messages = [{"role": "user", "content": prompt}]
        result = ask_llm_with_http(messages)
        if result and result.get("success"):
            q = result.get("answer", "")
            logger.info(f"[next_question] AI原始返回: {q}")
            return q if isinstance(q, str) else str(q)
        else:
            logger.error(f"[next_question] 大模型调用失败: {result}")
            return "请介绍一下你的技术背景和经验。"
    else:
        prompt = (
            f"你是{position}岗位的面试官。已问过如下问题及回答：\n" +
            "".join([
                f"Q{j+1}:{questions[j]}\nA{j+1}:{answers[j]}\n" for j in range(len(answers))
            ]) +
            "请根据应聘者的最新回答，提出下一个更有针对性的问题。请只用一句话返回问题内容，不要有多余解释。"
        )
        messages = [{"role": "user", "content": prompt}]
        result = ask_llm_with_http(messages)
        if result and result.get("success"):
            next_q = result.get("answer", "")
            logger.info(f"[next_question] AI原始返回: {next_q}")
            return next_q if isinstance(next_q, str) else str(next_q)
        else:
            logger.error(f"[next_question] 大模型调用失败: {result}")
            return "请详细说明你在项目中的具体贡献。"

def evaluate_interview(position, questions, answers, chat_id=None):
    """评估面试结果"""
    logger.info(f"[evaluate_interview] position={position}, questions={questions}, answers={answers}, chat_id={chat_id}")
    
    # 使用WebSocket调用大模型
    from llm_api import ask_llm_with_http
    
    eval_prompt = (
        "请根据以下面试问题和回答，从专业知识水平、技能匹配度、语言表达能力、逻辑思维能力、创新能力、应变抗压能力六个维度，量化评测并给出建议：\n"
    )
    for i, (q, a) in enumerate(zip(questions, answers)):
        eval_prompt += f"Q{i+1}: {q}\nA{i+1}: {a}\n"
    eval_prompt += (
        "请以如下标准JSON格式返回：\n"
        "{\n"
        "  \"abilities\": {\n"
        "    \"专业知识水平\": 0-100,\n"
        "    \"技能匹配度\": 0-100,\n"
        "    \"语言表达能力\": 0-100,\n"
        "    \"逻辑思维能力\": 0-100,\n"
        "    \"创新能力\": 0-100,\n"
        "    \"应变抗压能力\": 0-100\n"
        "  },\n"
        "  \"suggestions\": [\"建议1\", \"建议2\"]\n"
        "}\n"
        "不要有多余解释。"
    )
    
    messages = [{"role": "user", "content": eval_prompt}]
    result = ask_llm_with_http(messages)
    if result and result.get("success"):
        eval_result = result.get("answer", "")
        logger.info(f"[evaluate_interview] AI原始评测结果: {eval_result}")
        return eval_result
    else:
        logger.error(f"[evaluate_interview] 大模型调用失败: {result}")
        return "{\"abilities\": {\"专业知识水平\": 70, \"技能匹配度\": 75, \"语言表达能力\": 80, \"逻辑思维能力\": 75, \"创新能力\": 70, \"应变抗压能力\": 75}, \"suggestions\": [\"建议加强专业技能学习\", \"建议提升沟通表达能力\"]}"

def evaluate_interview_with_images(position, questions, answers, image_analyses, chat_id=None):
    """结合微表情分析的面试评估"""
    logger.info(f"[evaluate_interview_with_images] position={position}, questions={questions}, answers={answers}, image_analyses={image_analyses}, chat_id={chat_id}")
    
    # 构建包含微表情分析的评测提示
    eval_prompt = (
        "请根据以下面试问题和回答，以及面试过程中的微表情分析结果，从专业知识水平、技能匹配度、语言表达能力、逻辑思维能力、创新能力、应变抗压能力、情绪稳定性七个维度，量化评测并给出建议：\n\n"
    )
    
    # 添加问答内容和微表情分析
    for i, (q, a) in enumerate(zip(questions, answers)):
        eval_prompt += f"Q{i+1}: {q}\nA{i+1}: {a}\n"
        
        # 添加对应的微表情分析结果
        if i < len(image_analyses) and image_analyses[i]:
            eval_prompt += f"第{i+1}题答题时的微表情分析：\n"
            for j, analysis in enumerate(image_analyses[i]):
                if analysis and isinstance(analysis, dict):
                    analysis_text = analysis.get('analysis', '')
                    emotions = analysis.get('emotions', {})
                    micro_expressions = analysis.get('micro_expressions', {})
                    confidence = analysis.get('confidence', 0)
                    
                    eval_prompt += f"  图片{j+1}分析结果: {analysis_text}\n"
                    if emotions:
                        eval_prompt += f"    主要情绪: {emotions}\n"
                    if micro_expressions:
                        eval_prompt += f"    微表情: {micro_expressions}\n"
                    eval_prompt += f"    置信度: {confidence}\n"
            eval_prompt += "\n"
    
    eval_prompt += (
        "请综合考虑回答内容和微表情分析结果，以如下标准JSON格式返回评估：\n"
        "{\n"
        "  \"abilities\": {\n"
        "    \"专业知识水平\": 0-100,\n"
        "    \"技能匹配度\": 0-100,\n"
        "    \"语言表达能力\": 0-100,\n"
        "    \"逻辑思维能力\": 0-100,\n"
        "    \"创新能力\": 0-100,\n"
        "    \"应变抗压能力\": 0-100,\n"
        "    \"情绪稳定性\": 0-100\n"
        "  },\n"
        "  \"suggestions\": [\"建议1\", \"建议2\", \"建议3\"],\n"
        "  \"emotion_analysis\": {\n"
        "    \"overall_emotion\": \"整体情绪状态\",\n"
        "    \"confidence_level\": \"情绪稳定性评分\",\n"
        "    \"interview_performance\": \"面试表现评估\"\n"
        "  },\n"
        "  \"micro_expression_impact\": \"微表情对面试表现的影响分析\"\n"
        "}\n"
        "请确保JSON格式正确，不要有多余解释。"
    )
    
    # 使用WebSocket调用大模型
    from llm_api import ask_llm_with_http
    
    messages = [{"role": "user", "content": eval_prompt}]
    result = ask_llm_with_http(messages)
    if result and result.get("success"):
        eval_result = result.get("answer", "")
        logger.info(f"[evaluate_interview_with_images] AI原始评测结果: {eval_result}")
        return eval_result
    else:
        logger.error(f"[evaluate_interview_with_images] 大模型调用失败: {result}")
        return "{\"abilities\": {\"专业知识水平\": 70, \"技能匹配度\": 75, \"语言表达能力\": 80, \"逻辑思维能力\": 75, \"创新能力\": 70, \"应变抗压能力\": 75, \"情绪稳定性\": 80}, \"suggestions\": [\"建议加强专业技能学习\", \"建议提升沟通表达能力\", \"建议保持情绪稳定\"], \"emotion_analysis\": {\"overall_emotion\": \"整体情绪稳定\", \"confidence_level\": \"情绪稳定性良好\", \"interview_performance\": \"面试表现良好\"}, \"micro_expression_impact\": \"微表情分析显示面试者情绪稳定，有助于面试表现\"}" 