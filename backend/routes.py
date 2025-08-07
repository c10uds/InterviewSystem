# -*- coding: utf-8 -*-
"""
路由文件
包含所有API路由处理
"""

import os
import json
import logging
import uuid
from datetime import datetime, timedelta
from flask import request, jsonify, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from functools import wraps

from models import db, User, InterviewRecord, Position
from config import UPLOAD_FOLDER, DEFAULT_POSITIONS, JWT_SECRET, JWT_ALGORITHM
from utils import login_required, next_question, evaluate_interview, evaluate_interview_with_images
from llm_api import chat_manager, ask_llm_with_http, analyze_image_with_face_expression_api

from speech_recognition import get_speech_service

logger = logging.getLogger(__name__)

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'msg': '未登录'}), 401
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if not payload.get('is_admin'):
                return jsonify({'success': False, 'msg': '权限不足，需要管理员权限'}), 403
            request.user = payload
        except Exception:
            return jsonify({'success': False, 'msg': 'token无效或已过期'}), 401
        return f(*args, **kwargs)
    return decorated

def init_routes(app):
    """初始化所有路由"""
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """健康检查接口"""
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0"
        })

    @app.route('/api/login', methods=['POST'])
    def login():
        """用户登录"""
        try:
            data = request.get_json()
            email = data.get('email')
            password = data.get('password')
            
            if not email or not password:
                return jsonify({"error": "邮箱和密码不能为空"}), 400
            
            user = User.query.filter_by(email=email).first()
            if user and user.check_password(password):
                # 生成JWT token
                payload = {
                    'user_id': user.id,
                    'email': user.email,
                    'is_admin': user.is_admin,
                    'exp': datetime.utcnow() + timedelta(days=1)
                }
                token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                return jsonify({
                    "success": True,
                    "token": token,
                    "email": user.email,
                    "is_admin": user.is_admin,
                    "name": user.name,
                    "user": user.to_dict()
                })
            else:
                return jsonify({"error": "邮箱或密码错误"}), 401
        except Exception as e:
            logger.error(f"[login] 异常: {e}")
            return jsonify({"error": "登录失败"}), 500

    @app.route('/api/register', methods=['POST'])
    def register():
        """用户注册"""
        try:
            data = request.get_json()
            email = data.get('email')
            password = data.get('password')
            name = data.get('name', '')
            
            if not email or not password:
                return jsonify({"error": "邮箱和密码不能为空"}), 400
            
            # 检查邮箱是否已存在
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                return jsonify({"error": "邮箱已存在"}), 400
            
            # 创建新用户
            user = User(
                email=email,
                password_hash=generate_password_hash(password),
                name=name
            )
            db.session.add(user)
            db.session.commit()
            
            # 生成JWT token
            payload = {
                'user_id': user.id,
                'email': user.email,
                'is_admin': user.is_admin,
                'exp': datetime.utcnow() + timedelta(days=1)
            }
            token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            return jsonify({
                "success": True,
                "token": token,
                "email": user.email,
                "is_admin": user.is_admin,
                "name": user.name,
                "user": user.to_dict()
            })
        except Exception as e:
            logger.error(f"[register] 异常: {e}")
            return jsonify({"error": "注册失败"}), 500

    @app.route('/api/positions', methods=['GET'])
    def positions():
        """获取职位列表"""
        try:
            # 从数据库中获取所有激活的岗位
            positions = Position.query.filter_by(is_active=True).order_by(Position.created_at.desc()).all()
            
            # 如果没有岗位数据，返回默认岗位
            if not positions:
                positions_data = DEFAULT_POSITIONS
            else:
                # 只返回岗位名称，保持与前端期望的格式一致
                positions_data = [pos.name for pos in positions]
            
            return jsonify({
                "success": True,
                "positions": positions_data
            })
        except Exception as e:
            logger.error(f"[positions] 获取岗位列表失败: {e}")
            # 如果数据库查询失败，返回默认岗位
        return jsonify({
                "success": True,
            "positions": DEFAULT_POSITIONS
        })

    # @app.route('/api/learning_path', methods=['GET'])
    # def learning_path():
    #     """获取学习路径"""
    #     return jsonify({
    #         "resources": [
    #             {"type": "题库", "title": "行业面试题库", "url": "#"},
    #             {"type": "视频", "title": "表达训练视频", "url": "#"},
    #             {"type": "课程", "title": "岗位技能课程", "url": "#"}
    #         ]
    #     })

    @app.route('/api/questions', methods=['GET'])
    def questions():
        """获取预设问题列表"""
        position = request.args.get('position', '软件工程师')
        
        # 根据职位返回不同的问题
        question_map = {
            "软件工程师": [
                "请介绍一下你的技术栈和项目经验",
                "你如何看待代码质量和测试的重要性？",
                "请描述一个你解决过的技术难题",
                "你对新技术的学习方法是什么？"
            ],
            "前端开发": [
                "请介绍一下你的前端技术栈",
                "你如何优化前端性能？",
                "请描述一个你做过的前端项目",
                "你对前端框架的看法是什么？"
            ],
            "后端开发": [
                "请介绍一下你的后端技术栈",
                "你如何设计数据库结构？",
                "请描述一个你处理过的并发问题",
                "你对微服务架构的看法是什么？"
            ]
        }
        
        questions = question_map.get(position, question_map["软件工程师"])
        return jsonify({
            "questions": questions,
            "position": position
        })

    @app.route('/api/interview', methods=['POST'])
    def interview():
        """开始面试"""
        try:
            data = request.get_json()
            position = data.get('position', '软件工程师')
            
            # 生成第一个问题
            first_question = next_question(position, [], [])
            
            return jsonify({
                "success": True,
                "question": first_question,
                "position": position
            })
        except Exception as e:
            logger.error(f"[interview] 异常: {e}")
            return jsonify({"error": "开始面试失败"}), 500

    @app.route('/api/interview_next', methods=['POST'])
    @login_required
    def interview_next():
        """获取下一个面试问题"""
        try:
            data = request.get_json()
            position = data.get('position')
            questions = data.get('questions', [])
            answers = data.get('answers', [])
            chat_id = data.get('chat_id')
            
            if not position:
                return jsonify({"error": "职位不能为空"}), 400
            
            # 生成下一个问题
            next_q = next_question(position, questions, answers, chat_id)
            
            return jsonify({
                "success": True,
                "question": next_q
            })
        except Exception as e:
            logger.error(f"[interview_next] 异常: {e}")
            return jsonify({"error": "获取下一个问题失败"}), 500

    @app.route('/api/interview_evaluate', methods=['POST'])
    @login_required
    def interview_evaluate():
        """评估面试结果（包含微表情分析）"""
        try:
            data = request.get_json()
            position = data.get('position')
            questions = data.get('questions', [])
            answers = data.get('answers', [])
            image_analyses = data.get('image_analyses', [])
            chat_id = data.get('chat_id')
            
            if not position or not questions or not answers:
                return jsonify({"error": "缺少必要参数"}), 400
            
            # 根据是否有微表情分析选择评估方法
            if image_analyses and len(image_analyses) > 0:
                # 使用包含微表情分析的评估
                eval_result = evaluate_interview_with_images(position, questions, answers, image_analyses, chat_id)
                evaluation_type = "with_micro_expressions"
                logger.info(f"[interview_evaluate] 使用微表情分析评估，分析图片数量: {len(image_analyses)}")
            else:
                # 使用普通评估
                eval_result = evaluate_interview(position, questions, answers, chat_id)
                evaluation_type = "standard"
                logger.info(f"[interview_evaluate] 使用标准评估")
            
            # 尝试解析AI返回的JSON结果
            try:
                # import json
                # 尝试解析AI返回的JSON
                if isinstance(eval_result, str):
                    # 查找JSON开始和结束的位置
                    start = eval_result.find('{')
                    end = eval_result.rfind('}') + 1
                    if start != -1 and end != 0:
                        json_str = eval_result[start:end]
                        parsed_result = json.loads(json_str)
                        logger.info(f"[interview_evaluate] 解析AI结果成功: {parsed_result}")
                    else:
                        # 如果找不到JSON，创建一个默认结构
                        parsed_result = {
                            "abilities": {
                                "专业知识水平": 70,
                                "技能匹配度": 70,
                                "语言表达能力": 70,
                                "逻辑思维能力": 70,
                                "创新能力": 70,
                                "应变抗压能力": 70
                            },
                            "suggestions": ["建议加强专业技能学习", "建议提升沟通表达能力"]
                        }
                        logger.warning(f"[interview_evaluate] 无法解析AI结果，使用默认结构")
                else:
                    parsed_result = eval_result
            except Exception as e:
                logger.error(f"[interview_evaluate] 解析AI结果失败: {e}")
                # 使用默认结构
                parsed_result = {
                    "abilities": {
                        "专业知识水平": 70,
                        "技能匹配度": 70,
                        "语言表达能力": 70,
                        "逻辑思维能力": 70,
                        "创新能力": 70,
                        "应变抗压能力": 70
                    },
                    "suggestions": ["建议加强专业技能学习", "建议提升沟通表达能力"]
                }
            
            # 保存面试记录
            user_id = session.get('user_id')
            logger.info(f"[interview_evaluate] 保存面试记录，用户ID: {user_id}")
            logger.info(f"[interview_evaluate] 职位: {position}")
            logger.info(f"[interview_evaluate] 问题数量: {len(questions)}")
            logger.info(f"[interview_evaluate] 答案数量: {len(answers)}")
            logger.info(f"[interview_evaluate] 评估类型: {evaluation_type}")
            
            # 构建包含微表情分析的记录
            record_data = {
                "evaluation": parsed_result,
                "evaluation_type": evaluation_type
            }
            
            if image_analyses and len(image_analyses) > 0:
                record_data["image_analyses"] = image_analyses
                record_data["micro_expressions_count"] = len([a for a in image_analyses if a and a.get("success")])
            
            record = InterviewRecord(
                user_id=user_id,
                position=position,
                questions=json.dumps(questions),
                answers=json.dumps(answers),
                result=json.dumps(record_data)
            )
            db.session.add(record)
            db.session.commit()
            
            logger.info(f"[interview_evaluate] 面试记录保存成功，记录ID: {record.id}")
            
            return jsonify({
                "success": True,
                "result": parsed_result,
                "record_id": record.id,
                "evaluation_type": evaluation_type,
                "micro_expressions_analyzed": len([a for a in image_analyses if a and a.get("success")]) if image_analyses else 0
            })
        except Exception as e:
            logger.error(f"[interview_evaluate] 异常: {e}")
            return jsonify({"error": "评估面试失败"}), 500

    @app.route('/api/interview_records', methods=['GET'])
    @login_required
    def get_interview_records():
        """获取面试记录"""
        try:
            user_id = session.get('user_id')
            logger.info(f"[get_interview_records] 用户ID: {user_id}")
            
            records = InterviewRecord.query.filter_by(user_id=user_id).order_by(InterviewRecord.created_at.desc()).all()
            logger.info(f"[get_interview_records] 查询到 {len(records)} 条记录")
            
            records_data = [record.to_dict() for record in records]
            logger.info(f"[get_interview_records] 返回数据: {records_data}")
            
            return jsonify({
                "success": True,
                "records": records_data
            })
        except Exception as e:
            logger.error(f"[get_interview_records] 异常: {e}")
            return jsonify({"error": "获取面试记录失败"}), 500

    @app.route('/api/ai_questions', methods=['POST'])
    @login_required
    def ai_questions():
        """AI生成第一个面试问题"""
        try:
            data = request.get_json()
            position = data.get('position')
            resume_content = data.get('resume_content', '')
            
            if not position:
                return jsonify({"error": "职位不能为空"}), 400
            
            # 生成唯一的chat_id
            chat_id = f"interview_{uuid.uuid4().hex}"
            
            # 根据简历内容生成第一个问题
            if resume_content:
                prompt = f"你是{position}岗位的面试官。根据以下简历内容，生成第一个有针对性的面试问题：\n\n{resume_content}\n\n请只返回一个问题，不要编号，不要多余解释。"
            else:
                prompt = f"你是{position}岗位的面试官，请生成第一个专业的面试问题。请只返回一个问题，不要编号，不要多余解释。"
            
            # 使用非本地大模型API
            messages = [{"role": "user", "content": prompt}]
            result = ask_llm_with_http(messages)
            
            if result and result.get("success"):
                first_question = result.get("answer", "").strip()
                # 保存到对话历史
                chat_manager.add_message(chat_id, "user", prompt)
                chat_manager.add_message(chat_id, "assistant", first_question)
            
                return jsonify({
                    "success": True,
                        "question": first_question,
                        "chat_id": chat_id
                })
            else:
                logger.error(f"[ai_questions] AI返回失败: {result}")
                return jsonify({"error": "生成问题失败"}), 500
                
        except Exception as e:
            logger.error(f"[ai_questions] 异常: {e}")
            return jsonify({"error": "生成问题失败"}), 500

    @app.route('/api/ai_next_question', methods=['POST'])
    @login_required
    def ai_next_question():
        """AI根据回答生成下一个问题"""
        try:
            # 检查是否有音频文件上传
            audio_file = request.files.get('audio')
            audio_path = None
            user_answer = ""  # 初始化用户答案变量
            
            # 检查是否有照片文件上传
            image_files = request.files.getlist('images')
            image_paths = []
            
            # 处理音频文件
            if audio_file and audio_file.filename:
                import os
                import uuid
                
                # 检查文件类型，接受WebM格式
                if not audio_file.filename.lower().endswith('.webm'):
                    return jsonify({"error": "只支持WebM格式的音频文件"}), 400
                
                # 使用配置的上传目录下的audios子目录
                upload_dir = os.path.join(UPLOAD_FOLDER, 'audios')
                if not os.path.exists(upload_dir):
                    os.makedirs(upload_dir)
                
                # 生成唯一文件名，保存WebM文件
                filename = f"audio_{uuid.uuid4().hex}.webm"
                webm_path = os.path.join(upload_dir, filename)
                
                # 保存WebM音频文件
                audio_file.save(webm_path)
                logger.info(f"[ai_next_question] WebM音频文件已保存: {webm_path}")
                
                # 转换为PCM格式
                pcm_filename = f"audio_{uuid.uuid4().hex}.pcm"
                pcm_path = os.path.join(upload_dir, pcm_filename)
                
                try:
                    import subprocess
                    # 使用ffmpeg将WebM转换为PCM
                    cmd = [
                        'ffmpeg', '-i', webm_path, 
                        '-f', 's16le', '-acodec', 'pcm_s16le', 
                        '-ar', '16000', '-ac', '1', 
                        pcm_path, '-y'
                    ]
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    
                    if result.returncode == 0:
                        logger.info(f"[ai_next_question] WebM转PCM成功: {pcm_path}")
                        audio_path = pcm_path
                        # 删除WebM文件
                        os.remove(webm_path)
                    else:
                        logger.error(f"[ai_next_question] WebM转PCM失败: {result.stderr}")
                        audio_path = webm_path  # 使用原始WebM文件
                except Exception as convert_error:
                    logger.error(f"[ai_next_question] 音频转换异常: {convert_error}")
                    audio_path = webm_path  # 使用原始WebM文件
                
                # 使用新的语音识别服务
                try:
                    speech_service = get_speech_service()
                    if speech_service:
                        recognition_result = speech_service.recognize_speech(audio_path)
                        if recognition_result:
                            logger.info(f"[ai_next_question] 语音识别结果: {recognition_result}")
                            # 使用语音识别结果作为答案
                            user_answer = recognition_result.strip()
                        else:
                            logger.warning(f"[ai_next_question] 语音识别失败，使用文本答案")
                    else:
                        logger.error(f"[ai_next_question] 语音识别服务未初始化")
                except Exception as asr_error:
                    logger.error(f"[ai_next_question] 语音识别异常: {asr_error}")
            
            # 处理照片文件并进行微表情分析
            image_analyses = []
            if image_files:
                import os
                import uuid
                # 使用配置的上传目录下的photos子目录
                upload_dir = os.path.join(UPLOAD_FOLDER, 'photos')
                if not os.path.exists(upload_dir):
                    os.makedirs(upload_dir)
                
                for i, image_file in enumerate(image_files):
                    if image_file and image_file.filename:
                        # 生成唯一文件名
                        file_ext = os.path.splitext(image_file.filename)[-1] if image_file.filename else '.jpg'
                        filename = f"image_{uuid.uuid4().hex}{file_ext}"
                        image_path = os.path.join(upload_dir, filename)
                        
                        # 保存照片文件
                        image_file.save(image_path)
                        image_paths.append(image_path)
                        logger.info(f"[ai_next_question] 照片文件已保存: {image_path}")
                        
                        # 进行微表情分析 - 使用讯飞人脸特征分析API
                        try:
                            from llm_api import analyze_image_with_face_expression_api
                            
                            analysis_result = analyze_image_with_face_expression_api(image_path)
                            
                            if analysis_result.get("success"):
                                image_analyses.append(analysis_result)
                                logger.info(f"[ai_next_question] 大模型微表情分析成功: {analysis_result.get('analysis', '')[:100]}...")
                            else:
                                logger.warning(f"[ai_next_question] 大模型微表情分析失败: {analysis_result}")
                                image_analyses.append(None)
                        except Exception as analysis_error:
                            logger.error(f"[ai_next_question] 大模型微表情分析异常: {analysis_error}")
                            image_analyses.append(None)
                
                logger.info(f"[ai_next_question] 总共保存了 {len(image_paths)} 张照片，分析了 {len([a for a in image_analyses if a])} 张照片的微表情")
            
            # 获取数据 - 支持FormData和JSON两种格式
            if request.is_json:
                data = request.get_json()
                position = data.get('position')
                current_question = data.get('current_question', '')
                user_answer = data.get('user_answer', '') or user_answer
                chat_id = data.get('chat_id')
            else:
                # 处理FormData格式
                position = request.form.get('position')
                current_question = request.form.get('current_question', '')
                user_answer = request.form.get('user_answer', '') or user_answer
                chat_id = request.form.get('chat_id')
                data = {
                    'position': position,
                    'current_question': current_question,
                    'user_answer': user_answer,
                    'chat_id': chat_id
                }
            
            # 添加调试日志
            logger.info(f"[ai_next_question] 接收到的数据: position={position}, chat_id={chat_id}, current_question={current_question}")
            logger.info(f"[ai_next_question] 请求数据: {data}")
            
            if not position or not chat_id:
                logger.error(f"[ai_next_question] 参数验证失败: position={position}, chat_id={chat_id}")
                return jsonify({"error": "职位和会话ID不能为空"}), 400
            
            # 构建包含微表情分析的提示词
            micro_expression_info = ""
            if image_analyses:
                micro_expression_info = "\n\n微表情分析结果：\n"
                for i, analysis in enumerate(image_analyses):
                    if analysis and analysis.get("success"):
                        analysis_text = analysis.get("analysis", "")
                        emotions = analysis.get("emotions", {})
                        micro_expressions = analysis.get("micro_expressions", {})
                        
                        micro_expression_info += f"图片{i+1}分析：{analysis_text}\n"
                        if emotions:
                            micro_expression_info += f"  主要情绪：{emotions}\n"
                        if micro_expressions:
                            micro_expression_info += f"  微表情：{micro_expressions}\n"
                        micro_expression_info += "\n"
            
            # 构建提示词，让AI根据回答和微表情分析生成下一个问题
            prompt = f"""你是{position}岗位的面试官。

当前问题：{current_question}
应聘者回答：{user_answer}{micro_expression_info}

请根据应聘者的回答和微表情分析结果，提出下一个更有针对性的面试问题。注意：
1. 根据回答内容深入挖掘
2. 关注回答中的细节和逻辑
3. 结合微表情分析结果，关注应聘者的情绪状态和自信心
4. 如果发现紧张、焦虑等情绪，可以提出更温和的问题
5. 如果发现自信、从容等情绪，可以提出更有挑战性的问题
6. 提出能够进一步了解应聘者能力的问题
7. 保持问题的专业性和针对性

请只返回一个问题，不要编号，不要多余解释。"""
            
            # 使用非本地大模型API
            messages = chat_manager.get_messages(chat_id)
            messages.append({"role": "user", "content": prompt})
            
            result = ask_llm_with_http(messages)
            
            if result and result.get("success"):
                next_question = result.get("answer", "").strip()
                # 保存到对话历史
                chat_manager.add_message(chat_id, "user", prompt)
                chat_manager.add_message(chat_id, "assistant", next_question)
            
                return jsonify({
                    "success": True,
                    "question": next_question,
                    "chat_id": chat_id,
                    "audio_processed": audio_path is not None,
                    "image_analyses": image_analyses,
                    "micro_expressions_detected": len([a for a in image_analyses if a and a.get("success")])
                })
            else:
                logger.error(f"[ai_next_question] AI返回失败: {result}")
                return jsonify({"error": "生成下一个问题失败"}), 500
                
        except Exception as e:
            logger.error(f"[ai_next_question] 异常: {e}")
            return jsonify({"error": "生成下一个问题失败"}), 500

    @app.route('/api/upload_avatar', methods=['POST'])
    @login_required
    def upload_avatar():
        """上传头像"""
        try:
            if 'avatar' not in request.files:
                return jsonify({"error": "没有文件"}), 400
            
            file = request.files['avatar']
            if file.filename == '':
                return jsonify({"error": "没有选择文件"}), 400
            
            # 生成唯一文件名
            filename_safe = file.filename or "unknown"
            ext = os.path.splitext(filename_safe)[1]
            filename = f"avatar_{uuid.uuid4().hex}{ext}"
            # 使用配置的上传目录下的avatars子目录
            save_dir = os.path.join(UPLOAD_FOLDER, 'avatars')
            if not os.path.exists(save_dir):
                os.makedirs(save_dir)
            save_path = os.path.join(save_dir, filename)
            
            # 保存文件
            file.save(save_path)
            
            # 更新用户头像
            user_id = session['user_id']
            user = User.query.get(user_id)
            if user:
                user.avatar = filename
                db.session.commit()
            
            return jsonify({
                "success": True,
                "avatar_url": f"/static/avatars/{filename}"
            })
        except Exception as e:
            logger.error(f"[upload_avatar] 异常: {e}")
            return jsonify({"error": "上传头像失败"}), 500

    @app.route('/api/profile', methods=['GET'])
    @login_required
    def get_profile():
        """获取用户资料"""
        try:
            user_id = request.user.get('user_id')
            user = User.query.get(user_id)
            if user:
                return jsonify({
                    "success": True,
                    "user": user.to_dict()
                })
            else:
                return jsonify({"error": "用户不存在"}), 404
        except Exception as e:
            logger.error(f"[get_profile] 异常: {e}")
            return jsonify({"error": "获取用户资料失败"}), 500

    @app.route('/static/avatars/<filename>')
    def serve_avatar(filename):
        """提供头像文件"""
        avatar_dir = os.path.join(UPLOAD_FOLDER, 'avatars')
        return send_from_directory(avatar_dir, filename)

    @app.route('/api/upload_resume', methods=['POST'])
    @login_required
    def upload_resume():
        """上传简历"""
        try:
            if 'resume' not in request.files:
                return jsonify({"error": "没有文件"}), 400
            
            file = request.files['resume']
            if file.filename == '':
                return jsonify({"error": "没有选择文件"}), 400
            
            # 生成唯一文件名
            filename_safe = file.filename or "unknown"
            ext = os.path.splitext(filename_safe)[1]
            filename = f"resume_{uuid.uuid4().hex}{ext}"
            # 使用配置的上传目录下的resumes子目录
            save_dir = os.path.join(UPLOAD_FOLDER, 'resumes')
            if not os.path.exists(save_dir):
                os.makedirs(save_dir)
            save_path = os.path.join(save_dir, filename)
            
            # 保存文件
            file.save(save_path)
            
            # 读取简历内容
            try:
                with open(save_path, 'r', encoding='utf-8') as f:
                    resume_content = f.read()
                logger.info(f"[upload_resume] 成功读取简历内容，长度: {len(resume_content)}")
            except Exception as read_error:
                logger.error(f"[upload_resume] 读取简历内容失败: {read_error}")
                resume_content = ""
            
            # 更新用户简历信息
            user_id = request.user.get('user_id')  # 使用JWT方式获取用户ID
            user = User.query.get(user_id)
            if user:
                user.resume_filename = filename
                user.resume_upload_time = datetime.now()
                user.resume_content = resume_content  # 保存简历内容
                db.session.commit()
                logger.info(f"[upload_resume] 简历信息已保存到数据库，用户ID: {user_id}")
            else:
                logger.error(f"[upload_resume] 用户不存在，用户ID: {user_id}")
                return jsonify({"error": "用户不存在"}), 404
            
            return jsonify({
                "success": True,
                "resume_url": f"/static/resumes/{filename}"
            })
        except Exception as e:
            logger.error(f"[upload_resume] 异常: {e}")
            return jsonify({"error": "上传简历失败"}), 500

    @app.route('/api/generate_questions_from_resume', methods=['POST'])
    @login_required
    def generate_questions_from_resume():
        """根据简历生成问题"""
        try:
            data = request.get_json()
            logger.info(f"[generate_questions_from_resume] 接收到的数据: {data}")
            position = data.get('position')
            resume_content = data.get('resume_content', '')
            logger.info(f"[generate_questions_from_resume] position: '{position}', resume_content长度: {len(resume_content)}")
            
            if not position or not position.strip():
                return jsonify({"error": "职位不能为空"}), 400
            
            if not resume_content or not resume_content.strip():
                return jsonify({"error": "简历内容不能为空，请先上传简历"}), 400
            
            # 生成唯一的chat_id
            chat_id = f"resume_{uuid.uuid4().hex}"
            
            # 根据简历内容生成问题
            prompt = f"""你是{position}岗位的面试官。根据以下简历内容，生成10个有针对性的面试问题：

{resume_content}

请生成10个问题，每个问题一行，不要编号。问题应该：
1. 针对简历中的具体经历和技能
2. 涵盖技术能力、项目经验、解决问题能力
3. 包含行为面试和情景面试问题
4. 关注候选人的成长轨迹和职业规划

请只返回问题列表，每个问题一行，不要编号。"""
            
            # 使用非本地大模型API
            messages = [{"role": "user", "content": prompt}]
            result = ask_llm_with_http(messages)
            
            if result and result.get("success"):
                questions_text = result.get("answer", "")
                questions = [q.strip() for q in questions_text.split('\n') if q.strip()]
                
                # 保存到对话历史
                chat_manager.add_message(chat_id, "user", prompt)
                chat_manager.add_message(chat_id, "assistant", questions_text)
                
                if questions:
                    return jsonify({
                        "success": True,
                                "questions": questions,
                                "chat_id": chat_id
                            })
                else:
                    return jsonify({"error": "生成问题失败"}), 500
            else:
                logger.error(f"[generate_questions_from_resume] AI返回失败: {result}")
                return jsonify({"error": "生成问题失败"}), 500
                
        except Exception as e:
            logger.error(f"[generate_questions_from_resume] 异常: {e}")
            return jsonify({"error": "生成问题失败"}), 500

    @app.route('/api/logout', methods=['POST'])
    def logout():
        """用户登出"""
        # JWT token 是无状态的，客户端需要删除本地存储的 token
        return jsonify({"success": True, "msg": "登出成功"})

    # ====== 管理员功能 API ======

    @app.route('/api/admin/stats', methods=['GET'])
    @admin_required
    def admin_stats():
        """管理员统计数据"""
        try:
            user_count = User.query.count()
            admin_count = User.query.filter_by(is_admin=True).count()
            interview_count = InterviewRecord.query.count()
            position_count = Position.query.count()
            active_position_count = Position.query.filter_by(is_active=True).count()
            
            return jsonify({
                'success': True,
                'stats': {
                    'user_count': user_count,
                    'admin_count': admin_count,
                    'interview_count': interview_count,
                    'position_count': position_count,
                    'active_position_count': active_position_count
                }
            })
        except Exception as e:
            logger.error(f"[admin_stats] 获取统计数据失败: {e}")
            return jsonify({'success': False, 'msg': f'获取统计数据失败: {str(e)}'}), 500

    @app.route('/api/admin/users', methods=['GET'])
    @admin_required
    def admin_get_users():
        """获取所有用户列表"""
        try:
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 20, type=int)
            
            users_pagination = User.query.paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            users = [{
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'phone': user.phone,
                'school': user.school,
                'grade': user.grade,
                'target_position': user.target_position,
                'is_admin': user.is_admin,
                'interview_count': len(user.interview_records) if user.interview_records else 0
            } for user in users_pagination.items]
            
            return jsonify({
                'success': True,
                'users': users,
                'total': users_pagination.total,
                'pages': users_pagination.pages,
                'current_page': page
            })
        except Exception as e:
            logger.error(f"[admin_get_users] 获取用户列表失败: {e}")
            return jsonify({'success': False, 'msg': f'获取用户列表失败: {str(e)}'}), 500

    @app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
    @admin_required
    def admin_update_user(user_id):
        """更新用户信息"""
        try:
            user = User.query.get(user_id)
            if not user:
                return jsonify({'success': False, 'msg': '用户不存在'}), 404
            
            data = request.json
            if 'is_admin' in data:
                user.is_admin = data['is_admin']
            if 'name' in data:
                user.name = data['name']
            if 'phone' in data:
                user.phone = data['phone']
            if 'school' in data:
                user.school = data['school']
            if 'grade' in data:
                user.grade = data['grade']
            if 'target_position' in data:
                user.target_position = data['target_position']
            
            db.session.commit()
            logger.info(f"[admin_update_user] 更新用户成功: {user_id}")
            return jsonify({'success': True, 'msg': '用户信息更新成功'})
        except Exception as e:
            logger.error(f"[admin_update_user] 更新用户失败: {e}")
            return jsonify({'success': False, 'msg': f'更新用户失败: {str(e)}'}), 500

    @app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
    @admin_required
    def admin_delete_user(user_id):
        """删除用户"""
        try:
            user = User.query.get(user_id)
            if not user:
                return jsonify({'success': False, 'msg': '用户不存在'}), 404
            
            # 检查是否为当前管理员自己
            current_user_id = request.user.get('user_id')
            if user_id == current_user_id:
                return jsonify({'success': False, 'msg': '不能删除自己的账号'}), 400
            
            # 删除相关的面试记录
            InterviewRecord.query.filter_by(user_id=user_id).delete()
            
            # 删除用户
            db.session.delete(user)
            db.session.commit()
            
            logger.info(f"[admin_delete_user] 删除用户成功: {user_id}")
            return jsonify({'success': True, 'msg': '用户删除成功'})
        except Exception as e:
            logger.error(f"[admin_delete_user] 删除用户失败: {e}")
            return jsonify({'success': False, 'msg': f'删除用户失败: {str(e)}'}), 500

    @app.route('/api/admin/positions', methods=['GET'])
    @admin_required
    def admin_get_positions():
        """获取所有岗位列表"""
        try:
            positions = Position.query.order_by(Position.created_at.desc()).all()
            return jsonify({
                'success': True,
                'positions': [pos.to_dict() for pos in positions]
            })
        except Exception as e:
            logger.error(f"[admin_get_positions] 获取岗位列表失败: {e}")
            return jsonify({'success': False, 'msg': f'获取岗位列表失败: {str(e)}'}), 500

    @app.route('/api/admin/positions', methods=['POST'])
    @admin_required
    def admin_create_position():
        """新增岗位"""
        try:
            data = request.json
            name = data.get('name', '').strip()
            description = data.get('description', '').strip()
            
            if not name:
                return jsonify({'success': False, 'msg': '岗位名称不能为空'}), 400
            
            # 检查岗位是否已存在
            existing_position = Position.query.filter_by(name=name).first()
            if existing_position:
                return jsonify({'success': False, 'msg': '该岗位已存在'}), 400
            
            position = Position(
                name=name,
                description=description,
                is_active=True
            )
            
            db.session.add(position)
            db.session.commit()
            
            logger.info(f"[admin_create_position] 新增岗位成功: {name}")
            return jsonify({'success': True, 'msg': '岗位新增成功', 'position': position.to_dict()})
        except Exception as e:
            logger.error(f"[admin_create_position] 新增岗位失败: {e}")
            return jsonify({'success': False, 'msg': f'新增岗位失败: {str(e)}'}), 500

    @app.route('/api/admin/positions/<int:position_id>', methods=['PUT'])
    @admin_required
    def admin_update_position(position_id):
        """更新岗位信息"""
        try:
            position = Position.query.get(position_id)
            if not position:
                return jsonify({'success': False, 'msg': '岗位不存在'}), 404
            
            data = request.json
            if 'name' in data:
                new_name = data['name'].strip()
                if not new_name:
                    return jsonify({'success': False, 'msg': '岗位名称不能为空'}), 400
                
                # 检查新名称是否与其他岗位重复
                existing_position = Position.query.filter(
                    Position.name == new_name,
                    Position.id != position_id
                ).first()
                if existing_position:
                    return jsonify({'success': False, 'msg': '该岗位名称已存在'}), 400
                
                position.name = new_name
            
            if 'description' in data:
                position.description = data['description'].strip()
            
            if 'is_active' in data:
                position.is_active = data['is_active']
            
            position.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"[admin_update_position] 更新岗位成功: {position_id}")
            return jsonify({'success': True, 'msg': '岗位信息更新成功', 'position': position.to_dict()})
        except Exception as e:
            logger.error(f"[admin_update_position] 更新岗位失败: {e}")
            return jsonify({'success': False, 'msg': f'更新岗位失败: {str(e)}'}), 500

    @app.route('/api/admin/positions/<int:position_id>', methods=['DELETE'])
    @admin_required
    def admin_delete_position(position_id):
        """删除岗位"""
        try:
            position = Position.query.get(position_id)
            if not position:
                return jsonify({'success': False, 'msg': '岗位不存在'}), 404
            
            db.session.delete(position)
            db.session.commit()
            
            logger.info(f"[admin_delete_position] 删除岗位成功: {position_id}")
            return jsonify({'success': True, 'msg': '岗位删除成功'})
        except Exception as e:
            logger.error(f"[admin_delete_position] 删除岗位失败: {e}")
            return jsonify({'success': False, 'msg': f'删除岗位失败: {str(e)}'}), 500

    @app.route('/api/admin/interviews', methods=['GET'])
    @admin_required
    def admin_get_interviews():
        """获取所有面试记录"""
        try:
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 20, type=int)
            
            interviews_pagination = InterviewRecord.query.join(User).order_by(
                InterviewRecord.created_at.desc()
            ).paginate(page=page, per_page=per_page, error_out=False)
            
            interviews = []
            for record in interviews_pagination.items:
                try:
                    result_data = json.loads(record.result) if record.result else {}
                except:
                    result_data = {}
                
                interviews.append({
                    'id': record.id,
                    'user_id': record.user_id,
                    'user_name': record.user.name if record.user else '未知用户',
                    'user_email': record.user.email if record.user else '未知邮箱',
                    'position': record.position,
                    'created_at': record.created_at.isoformat() if record.created_at else '',
                    'questions_count': len(json.loads(record.questions)) if record.questions else 0,
                    'answers_count': len(json.loads(record.answers)) if record.answers else 0,
                    'result_summary': result_data.get('abilities', {}) if isinstance(result_data, dict) else {}
                })
            
            return jsonify({
                'success': True,
                'interviews': interviews,
                'total': interviews_pagination.total,
                'pages': interviews_pagination.pages,
                'current_page': page
            })
        except Exception as e:
            logger.error(f"[admin_get_interviews] 获取面试记录失败: {e}")
            return jsonify({'success': False, 'msg': f'获取面试记录失败: {str(e)}'}), 500

    @app.route('/api/admin/interviews/<int:interview_id>', methods=['GET'])
    @admin_required
    def admin_get_interview_detail(interview_id):
        """获取面试记录详情"""
        try:
            interview = InterviewRecord.query.get(interview_id)
            if not interview:
                return jsonify({'success': False, 'msg': '面试记录不存在'}), 404
            
            try:
                questions = json.loads(interview.questions) if interview.questions else []
                answers = json.loads(interview.answers) if interview.answers else []
                result = json.loads(interview.result) if interview.result else {}
            except:
                questions = []
                answers = []
                result = {}
            
            detail = {
                'id': interview.id,
                'user_id': interview.user_id,
                'user_name': interview.user.name if interview.user else '未知用户',
                'user_email': interview.user.email if interview.user else '未知邮箱',
                'position': interview.position,
                'questions': questions,
                'answers': answers,
                'result': result,
                'created_at': interview.created_at.isoformat() if interview.created_at else ''
            }
            
            return jsonify({'success': True, 'interview': detail})
        except Exception as e:
            logger.error(f"[admin_get_interview_detail] 获取面试记录详情失败: {e}")
            return jsonify({'success': False, 'msg': f'获取面试记录详情失败: {str(e)}'}), 500

    # ====== 管理员功能 API 结束 ======

    return app 