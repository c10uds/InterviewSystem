from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv
from functools import wraps
from flask import send_from_directory
from flask_migrate import Migrate
import requests
import json
import cv2
import base64
from langsmith import traceable
from langgraph_agent import next_question, evaluate_interview
import uuid
import logging

load_dotenv()

app = Flask(__name__)
CORS(app)
app.secret_key = 'your_secret_key'  # 用于session
# SQLAlchemy数据库配置
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI', 'mysql+pymysql://root:123qwe@localhost/interview_demo')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(512), nullable=False)
    name = db.Column(db.String(64))
    phone = db.Column(db.String(32))
    school = db.Column(db.String(64))
    grade = db.Column(db.String(32))
    target_position = db.Column(db.String(64))
    is_admin = db.Column(db.Boolean, default=False)
    avatar = db.Column(db.String(256), default=None)  # 新增头像字段

    def check_password(self, password):
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
            'avatar': self.avatar
        }

class InterviewRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    position = db.Column(db.String(64))
    questions = db.Column(db.Text)  # json.dumps(list)
    answers = db.Column(db.Text)    # json.dumps(list)
    audio_urls = db.Column(db.Text) # json.dumps(list)
    result = db.Column(db.Text)     # json.dumps(dict)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# init_db()  # 已弃用，使用Flask-Migrate自动迁移

# JWT配置
JWT_SECRET = os.getenv('JWT_SECRET', 'your_jwt_secret')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'msg': '未登录'}), 401
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            request.user = payload
        except Exception:
            return jsonify({'success': False, 'msg': 'token无效或已过期'}), 401
        return f(*args, **kwargs)
    return decorated

# 日志系统配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    handlers=[
        logging.FileHandler('app.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    logger.info("[POST] /api/login 请求: %s", data)
    if not data or not isinstance(data, dict):
        logger.warning("/api/login 参数错误: %s", data)
        return jsonify({'success': False, 'msg': '参数错误'}), 400
    email = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(email=email).first()
    if user and user.check_password(password):
        payload = {
            'user_id': user.id,
            'email': user.email,
            'is_admin': user.is_admin,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        logger.info("/api/login 登录成功: %s", email)
        return jsonify({'success': True, 'token': token, 'email': user.email, 'is_admin': user.is_admin, 'name': user.name})
    else:
        logger.warning("/api/login 登录失败: %s", email)
        return jsonify({'success': False, 'msg': '邮箱或密码错误'}), 401

# from sdk_wrapper import analyze_interview, get_positions, get_questions

# app = Flask(__name__)

@app.route('/api/positions', methods=['GET'])
def positions():
    logger.info("[GET] /api/positions 被调用，token=%s", request.headers.get('Authorization'))
    return jsonify({'positions': ['前端开发', '后端开发', '产品经理']})

@app.route('/api/questions', methods=['GET'])
def questions():
    position = request.args.get('position')
    # 根据岗位返回不同题目
    position_questions = {
        '前端开发': [
            '请自我介绍一下',
            '你熟悉哪些前端框架？',
            '说说你对响应式设计的理解',
            '如何优化前端性能？',
            '介绍一下你常用的调试工具',
            '你如何处理浏览器兼容性问题？',
            '说说你对前端安全的理解',
            '你了解哪些前端构建工具？',
            '请描述一次你解决技术难题的经历',
            '你怎么看待前后端分离？'
        ],
        '后端开发': [
            '请自我介绍一下',
            '你熟悉哪些后端开发语言？',
            '说说你对RESTful API的理解',
            '如何保证接口的安全性？',
            '你如何优化数据库性能？',
            '介绍一下你常用的后端框架',
            '你如何处理高并发场景？',
            '说说你对微服务的理解',
            '请描述一次你解决线上故障的经历',
            '你怎么看待DevOps？'
        ],
        '产品经理': [
            '请自我介绍一下',
            '你如何理解产品经理的职责？',
            '说说你主导过的一个产品项目',
            '你如何进行需求分析？',
            '如何与技术团队高效沟通？',
            '你怎么看待用户体验？',
            '遇到需求变更你会怎么处理？',
            '如何评估产品上线后的效果？',
            '请描述一次你推动项目落地的经历',
            '你怎么看待数据驱动产品？'
        ]
    }
    default_questions = ['请自我介绍一下', '你最大的优点是什么？']
    questions = position_questions.get(position, default_questions)
    return jsonify(questions)

@app.route('/api/interview', methods=['POST'])
def interview():
    # 这里只做简单mock
    return jsonify({
        'abilities': {
            '专业知识水平': 80,
            '技能匹配度': 75,
            '语言表达能力': 80,
            '逻辑思维能力': 78,
            '创新能力': 72,
            '应变抗压能力': 85
        },
        'key_issues': ['表达略显紧张'],
        'suggestions': ['建议多练习面试表达']
    })

@app.route('/api/learning_path', methods=['GET'])
def learning_path():
    return jsonify({
        "resources": [
            {"type": "题库", "title": "行业面试题库", "url": "#"},
            {"type": "视频", "title": "表达训练视频", "url": "#"},
            {"type": "课程", "title": "岗位技能课程", "url": "#"}
        ]
    })

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    logger.info("[POST] /api/register 请求: %s", data)
    if not data or not isinstance(data, dict):
        logger.warning("/api/register 参数错误: %s", data)
        return jsonify({'success': False, 'msg': '参数错误'}), 400
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    phone = data.get('phone')
    school = data.get('school')
    grade = data.get('grade')
    target_position = data.get('target_position')
    if not all([email, password, name, phone, school, grade, target_position]):
        logger.warning("/api/register 缺少字段: %s", data)
        return jsonify({'success': False, 'msg': '所有字段均为必填'}), 400
    if User.query.filter_by(email=email).first():
        logger.warning("/api/register 邮箱已注册: %s", email)
        return jsonify({'success': False, 'msg': '该邮箱已注册'}), 400
    user = User(
        email=email,
        password_hash=generate_password_hash(password),
        name=name,
        phone=phone,
        school=school,
        grade=grade,
        target_position=target_position,
        is_admin=False
    )
    db.session.add(user)
    db.session.commit()
    logger.info("/api/register 注册成功: %s", email)
    return jsonify({'success': True, 'msg': '注册成功'})

UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads/avatars')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/api/upload_avatar', methods=['POST'])
@login_required
def upload_avatar():
    file = request.files.get('avatar')
    if not file or file.filename == '':
        return jsonify({'success': False, 'msg': '未选择文件'}), 400
    if not (file.filename.lower().endswith('.png') or file.filename.lower().endswith('.jpg') or file.filename.lower().endswith('.jpeg')):
        return jsonify({'success': False, 'msg': '仅支持PNG/JPG图片'}), 400
    filename = f"avatar_{int(datetime.datetime.now().timestamp())}_{file.filename}"
    save_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(save_path)
    url = f"/static/avatars/{filename}"
    # 解析token获取用户
    token = request.headers.get('Authorization')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = User.query.get(payload['user_id'])
        if user:
            user.avatar = url
            db.session.commit()
            return jsonify({'success': True, 'url': url})
        else:
            return jsonify({'success': False, 'msg': '用户不存在'}), 404
    except Exception:
        return jsonify({'success': False, 'msg': 'token无效'}), 401

@app.route('/api/profile', methods=['GET'])
@login_required
def get_profile():
    token = request.headers.get('Authorization')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = User.query.get(payload['user_id'])
        if user:
            return jsonify({'success': True, 'user': user.to_dict()})
        else:
            return jsonify({'success': False, 'msg': '用户不存在'}), 404
    except Exception:
        return jsonify({'success': False, 'msg': 'token无效'}), 401

@app.route('/static/avatars/<filename>')
def serve_avatar(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

AI_BASE_URL = 'http://127.0.0.1:8081'

# 删除CppAISDK类、cpp_sdk对象、interview_workflow函数

@app.route('/api/interview_next', methods=['POST'])
@login_required
def interview_next():
    data = request.form
    position = data.get('position')
    questions = json.loads(data.get('questions', '[]'))
    answers = json.loads(data.get('answers', '[]'))
    audio_file = request.files.get('audio')
    asr_text = ""
    if audio_file:
        filename = f"answer_{int(datetime.datetime.now().timestamp())}_{audio_file.filename}"
        save_path = os.path.join(UPLOAD_FOLDER, filename)
        audio_file.save(save_path)
        # 语音转文本
        from langgraph_agent import cpp_sdk
        asr_text = cpp_sdk.asr(save_path)
        answers.append(asr_text)
    next_q = next_question(position, questions, answers)
    questions.append(next_q)
    return jsonify({'next_question': next_q, 'questions': questions, 'answers': answers})

@app.route('/api/interview_evaluate', methods=['POST'])
@login_required
def interview_evaluate():
    data = request.form
    position = data.get('position')
    questions = json.loads(data.get('questions', '[]'))
    answers = json.loads(data.get('answers', '[]'))
    audio_files = request.files.getlist('audios')
    audio_paths = []
    for audio in audio_files:
        filename = f"answer_{int(datetime.datetime.now().timestamp())}_{audio.filename}"
        save_path = os.path.join(UPLOAD_FOLDER, filename)
        audio.save(save_path)
        audio_paths.append(save_path)
    # 评测
    eval_result = evaluate_interview(position, questions, answers)
    # 保存到数据库
    user_token = request.headers.get('Authorization')
    payload = jwt.decode(user_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    user = User.query.get(payload['user_id'])
    record = InterviewRecord(
        user_id=user.id,
        position=position,
        questions=json.dumps(questions),
        answers=json.dumps(answers),
        audio_urls=json.dumps(audio_paths),
        result=json.dumps(eval_result)
    )
    db.session.add(record)
    db.session.commit()
    return jsonify({'success': True, 'result': eval_result})

@app.route('/api/interview_records', methods=['GET'])
@login_required
def get_interview_records():
    token = request.headers.get('Authorization')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = User.query.get(payload['user_id'])
        if user:
            records = InterviewRecord.query.filter_by(user_id=user.id).order_by(InterviewRecord.created_at.desc()).all()
            return jsonify({'success': True, 'records': [
                {
                    'id': r.id,
                    'position': r.position,
                    'created_at': r.created_at.isoformat() if r.created_at else '',
                    'result': r.result
                } for r in records
            ]})
        else:
            return jsonify({'success': False, 'msg': '用户不存在'}), 404
    except Exception:
        return jsonify({'success': False, 'msg': 'token无效'}), 401

# 简单内存 session 存储
INTERVIEW_SESSION = {}

@app.route('/api/ai_questions', methods=['POST'])
@login_required
def ai_questions():
    data = request.json
    user = getattr(request, 'user', {})
    logger.info("[POST] /api/ai_questions 用户: %s, 请求: %s", user, data)
    position = data.get('position', '')
    position_questions = {
        '前端开发': [
            '请自我介绍一下',
            '你熟悉哪些前端框架？',
            '说说你对响应式设计的理解',
            '如何优化前端性能？',
            '介绍一下你常用的调试工具',
            '你如何处理浏览器兼容性问题？',
            '说说你对前端安全的理解',
            '你了解哪些前端构建工具？',
            '请描述一次你解决技术难题的经历',
            '你怎么看待前后端分离？'
        ],
        '后端开发': [
            '请自我介绍一下',
            '你熟悉哪些后端开发语言？',
            '说说你对RESTful API的理解',
            '如何保证接口的安全性？',
            '你如何优化数据库性能？',
            '介绍一下你常用的后端框架',
            '你如何处理高并发场景？',
            '说说你对微服务的理解',
            '请描述一次你解决线上故障的经历',
            '你怎么看待DevOps？'
        ],
        '产品经理': [
            '请自我介绍一下',
            '你如何理解产品经理的职责？',
            '说说你主导过的一个产品项目',
            '你如何进行需求分析？',
            '如何与技术团队高效沟通？',
            '你怎么看待用户体验？',
            '遇到需求变更你会怎么处理？',
            '如何评估产品上线后的效果？',
            '请描述一次你推动项目落地的经历',
            '你怎么看待数据驱动产品？'
        ]
    }
    default_questions = ['请自我介绍一下', '你最大的优点是什么？', '你最大的缺点是什么？']
    questions = position_questions.get(position, default_questions)[:3]
    session_id = str(uuid.uuid4())
    INTERVIEW_SESSION[session_id] = {
        'position': position,
        'history_questions': questions[:],
        'history_answers': []
    }
    logger.info("/api/ai_questions 返回: session_id=%s, questions=%s", session_id, questions)
    return jsonify({'success': True, 'questions': questions, 'session_id': session_id})

@app.route('/api/ai_next_question', methods=['POST'])
@login_required
def ai_next_question():
    data = request.json
    user = getattr(request, 'user', {})
    session_id = data.get('session_id')
    question = data.get('question')
    answer = data.get('answer')
    logger.info("[POST] /api/ai_next_question 用户: %s, session_id: %s, question: %s, answer: %s", user, session_id, question, answer)
    if not session_id or session_id not in INTERVIEW_SESSION:
        logger.warning("/api/ai_next_question 无效session_id: %s", session_id)
        return jsonify({'success': False, 'msg': '无效的session_id'}), 400
    if not question or answer is None:
        logger.warning("/api/ai_next_question 缺少题目或答案: %s", data)
        return jsonify({'success': False, 'msg': '缺少题目或答案'}), 400
    # 记录历史
    INTERVIEW_SESSION[session_id]['history_questions'].append(question)
    INTERVIEW_SESSION[session_id]['history_answers'].append(answer)
    # 这里调用AI生成新题目，直接用已导入的 next_question
    position = INTERVIEW_SESSION[session_id]['position']
    history_questions = INTERVIEW_SESSION[session_id]['history_questions']
    history_answers = INTERVIEW_SESSION[session_id]['history_answers']
    round_num = len(history_questions)
    if round_num >= 10:
        logger.info("/api/ai_next_question 已达最大轮数: %s", session_id)
        return jsonify({'success': True, 'questions': []})
    # 调用AI生成新题目
    new_q = next_question(position, history_questions, history_answers)
    next_questions = [new_q] if new_q else []
    INTERVIEW_SESSION[session_id]['history_questions'].extend(next_questions)
    logger.info("/api/ai_next_question 返回: %s", next_questions)
    return jsonify({'success': True, 'questions': next_questions})

if __name__ == '__main__':
    app.run(debug=True) 