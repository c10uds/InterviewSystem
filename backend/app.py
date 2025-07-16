from flask import Flask, request, jsonify
from sdk_wrapper import analyze_interview, get_positions, get_questions

app = Flask(__name__)

@app.route('/api/positions', methods=['GET'])
def positions():
    return jsonify(get_positions())

@app.route('/api/questions', methods=['GET'])
def questions():
    position = request.args.get('position')
    return jsonify(get_questions(position))

@app.route('/api/interview', methods=['POST'])
def interview():
    audio = request.files.get('audio')
    text = request.form.get('text')
    video = request.files.get('video')  # 预留视频分析
    position = request.form.get('position')
    result = analyze_interview(audio, text, video, position)
    return jsonify(result)

@app.route('/api/learning_path', methods=['GET'])
def learning_path():
    position = request.args.get('position')
    return jsonify({
        "resources": [
            {"type": "题库", "title": f"{position}行业面试题库", "url": "#"},
            {"type": "视频", "title": "表达训练视频", "url": "#"},
            {"type": "课程", "title": f"{position}岗位技能课程", "url": "#"}
        ]
    })

if __name__ == '__main__':
    app.run(debug=True) 