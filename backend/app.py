from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import os
from functools import wraps
from flask import send_from_directory
from flask_migrate import Migrate
import requests
import json

app = Flask(__name__)
CORS(app)
app.secret_key = 'your_secret_key'  # 用于session
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:123qwe@localhost/interview_demo'
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

JWT_SECRET = 'jwt_secret_key'
JWT_ALGORITHM = 'HS256'

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

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data or not isinstance(data, dict):
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
        return jsonify({'success': True, 'token': token, 'email': user.email, 'is_admin': user.is_admin, 'name': user.name})
    else:
        return jsonify({'success': False, 'msg': '邮箱或密码错误'}), 401

# from sdk_wrapper import analyze_interview, get_positions, get_questions

# app = Flask(__name__)

@app.route('/api/positions', methods=['GET'])
def positions():
    return jsonify(['前端开发', '后端开发', '产品经理'])

@app.route('/api/questions', methods=['GET'])
def questions():
    position = request.args.get('position')
    # 可根据岗位返回不同题目
    return jsonify(['请自我介绍一下', '你最大的优点是什么？'])

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
    if not data or not isinstance(data, dict):
        return jsonify({'success': False, 'msg': '参数错误'}), 400
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    phone = data.get('phone')
    school = data.get('school')
    grade = data.get('grade')
    target_position = data.get('target_position')
    if not all([email, password, name, phone, school, grade, target_position]):
        return jsonify({'success': False, 'msg': '所有字段均为必填'}), 400
    if User.query.filter_by(email=email).first():
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
    return jsonify({'success': True, 'msg': '注册成功'})

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads', 'avatars')
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

@app.route('/api/ai_questions', methods=['POST'])
@login_required
def ai_questions():
    data = request.json
    position = data.get('position')
    if not position:
        return jsonify({'success': False, 'msg': '缺少岗位参数'}), 400
    # 调用本地AI接口生成问题
    prompt = f"请为{position}岗位生成10个典型面试问题，要求简洁明了。"
    ai_res = requests.post(f'{AI_BASE_URL}/api/llm', data={'question': prompt, 'model': 'spark'})
    ai_data = ai_res.json()
    # 假设AI返回answer为\n分割的题目
    questions = [q.strip() for q in ai_data.get('answer', '').split('\n') if q.strip()]
    if len(questions) < 10:
        questions += [f"补充问题{i+1}" for i in range(10-len(questions))]
    return jsonify({'success': True, 'questions': questions[:10]})

@app.route('/api/ai_evaluate', methods=['POST'])
@login_required
def ai_evaluate():
    user_token = request.headers.get('Authorization')
    payload = jwt.decode(user_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    user = User.query.get(payload['user_id'])
    position = request.form.get('position')
    questions = json.loads(request.form.get('questions', '[]'))
    answers = json.loads(request.form.get('answers', '[]'))
    # 处理音频文件
    audio_files = request.files.getlist('audios')
    audio_urls = []
    asr_texts = []
    for audio in audio_files:
        filename = f"answer_{int(datetime.datetime.now().timestamp())}_{audio.filename}"
        save_path = os.path.join(UPLOAD_FOLDER, filename)
        audio.save(save_path)
        audio_urls.append(f"/static/avatars/{filename}")
        # 语音识别
        asr_res = requests.post(f'{AI_BASE_URL}/api/asr', files={'audio': open(save_path, 'rb')}, data={'language': 'zh_cn'})
        asr_data = asr_res.json()
        asr_texts.append(asr_data.get('text', ''))
    # 多模态评测
    eval_prompt = f"请根据以下面试问题和回答，从专业知识水平、技能匹配度、语言表达能力、逻辑思维能力、创新能力、应变抗压能力六个维度，量化评测并给出建议：\n"
    for i, (q, a, t) in enumerate(zip(questions, answers, asr_texts)):
        eval_prompt += f"Q{i+1}: {q}\nA{i+1}: {a}\n语音识别: {t}\n"
    eval_prompt += "请以JSON格式返回各项能力分数和改进建议。"
    eval_res = requests.post(f'{AI_BASE_URL}/api/llm', data={'question': eval_prompt, 'model': 'spark'})
    eval_data = eval_res.json()
    # 保存面试记录
    record = InterviewRecord(
        user_id=user.id,
        position=position,
        questions=json.dumps(questions),
        answers=json.dumps(answers),
        audio_urls=json.dumps(audio_urls),
        result=json.dumps(eval_data)
    )
    db.session.add(record)
    db.session.commit()
    return jsonify({'success': True, 'result': eval_data})

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

@app.route('/api/ai_next_question', methods=['POST'])
@login_required
def ai_next_question():
    data = request.json
    position = data.get('position')
    history_questions = data.get('history_questions', [])
    history_answers = data.get('history_answers', [])
    last_answer = data.get('last_answer', '')
    if not position or not last_answer:
        return jsonify({'success': False, 'msg': '参数不全'}), 400
    # 构造prompt
    prompt = f"你是{position}岗位的面试官。已问过如下问题及回答：\n"
    for i, (q, a) in enumerate(zip(history_questions, history_answers)):
        prompt += f"Q{i+1}:{q}\nA{i+1}:{a}\n"
    prompt += f"请根据应聘者的最新回答，提出下一个更有针对性的问题。"
    ai_res = requests.post(f'{AI_BASE_URL}/api/llm', data={'question': prompt, 'model': 'spark'})
    ai_data = ai_res.json()
    next_question = ai_data.get('answer', '').strip()
    return jsonify({'success': True, 'question': next_question})

if __name__ == '__main__':
    app.run(debug=True) 