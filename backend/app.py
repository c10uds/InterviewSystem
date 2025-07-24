from flask import Flask, request, jsonify, session
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.secret_key = 'your_secret_key'  # 用于session

# 简单用户数据，实际应为数据库
USERS = {
    'testuser': 'testpass'
}

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data or not isinstance(data, dict):
        return jsonify({'success': False, 'msg': '参数错误'}), 400
    username = data.get('username')
    password = data.get('password')
    if username in USERS and USERS[username] == password:
        # 简单token生成，实际应用jwt
        token = f"token_{username}"
        session['user'] = username
        return jsonify({'success': True, 'token': token, 'username': username})
    else:
        return jsonify({'success': False, 'msg': '用户名或密码错误'}), 401

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

if __name__ == '__main__':
    app.run(debug=True) 