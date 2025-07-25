#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
图像识别API测试脚本
"""

import requests
import json
import base64
import os
import time
from io import BytesIO
from PIL import Image, ImageDraw

def create_test_image():
    """创建一个测试图像"""
    # 创建一个简单的测试图像 (640x480, 白色背景)
    img = Image.new('RGB', (640, 480), color='white')
    draw = ImageDraw.Draw(img)
    
    # 画一个简单的人脸轮廓 (圆形)
    draw.ellipse([200, 100, 440, 340], outline='black', width=3)
    
    # 眼睛
    draw.ellipse([240, 160, 280, 200], fill='black')
    draw.ellipse([360, 160, 400, 200], fill='black')
    
    # 鼻子
    draw.line([320, 200, 320, 260], fill='black', width=2)
    
    # 嘴巴
    draw.arc([280, 280, 360, 320], start=0, end=180, fill='black', width=3)
    
    # 保存为内存中的字节流
    img_bytes = BytesIO()
    img.save(img_bytes, format='JPEG', quality=85)
    img_bytes.seek(0)
    
    return img_bytes.getvalue()

def encode_image_to_base64(image_data):
    """将图像数据编码为base64"""
    return base64.b64encode(image_data).decode('utf-8')

def test_image_recognition_api():
    """测试图像识别API"""
    
    print("=== 图像识别API测试 ===")
    
    server_url = "http://localhost:8081"
    
    # 创建测试图像
    print("创建测试图像...")
    image_data = create_test_image()
    image_base64 = encode_image_to_base64(image_data)
    
    # 测试用例1: 基本人脸检测
    print("\n1. 测试基本人脸检测...")
    
    payload = {
        "image_data": image_base64,
        "format": "jpeg",
        "detect_faces": True,
        "analyze_emotion": False,
        "analyze_micro_expression": False,
        "analysis_mode": "general"
    }
    
    try:
        response = requests.post(f"{server_url}/api/image", 
                               json=payload, 
                               timeout=30)
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✓ API调用成功")
            print(f"图像尺寸: {result.get('image_width', 'N/A')}x{result.get('image_height', 'N/A')}")
            print(f"检测到人脸数: {len(result.get('faces', []))}")
            
            for i, face in enumerate(result.get('faces', [])):
                print(f"  人脸{i+1}: 位置({face['x']},{face['y']}) 尺寸({face['width']}x{face['height']}) 置信度:{face['confidence']:.3f}")
                print(f"    性别: {face.get('gender', 'N/A')} 年龄: {face.get('age', 'N/A')}")
        else:
            print(f"✗ API调用失败: {response.text}")
            
    except Exception as e:
        print(f"✗ 请求异常: {e}")
    
    # 测试用例2: 完整分析 (人脸+情绪+微表情)
    print("\n2. 测试完整图像分析...")
    
    payload = {
        "image_data": image_base64,
        "format": "jpeg",
        "detect_faces": True,
        "analyze_emotion": True,
        "analyze_micro_expression": True,
        "analysis_mode": "interview"
    }
    
    try:
        response = requests.post(f"{server_url}/api/image", 
                               json=payload, 
                               timeout=30)
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✓ 完整分析成功")
            
            # 人脸信息
            faces = result.get('faces', [])
            print(f"检测到人脸数: {len(faces)}")
            for i, face in enumerate(faces):
                print(f"  人脸{i+1}: {face.get('emotion', 'N/A')} (置信度: {face.get('emotion_score', 0):.3f})")
            
            # 微表情信息
            micro_expressions = result.get('micro_expressions', [])
            print(f"检测到微表情数: {len(micro_expressions)}")
            for i, expr in enumerate(micro_expressions):
                print(f"  微表情{i+1}: {expr.get('expression', 'N/A')} (强度: {expr.get('intensity', 0):.3f}, 持续: {expr.get('duration', 0):.2f}s)")
                print(f"    描述: {expr.get('description', 'N/A')}")
            
            # 面试分析
            if 'interview_analysis' in result:
                analysis = result['interview_analysis']
                print("\n面试表现分析:")
                print(f"  专注度: {analysis.get('attention_score', 0):.3f}")
                print(f"  自信度: {analysis.get('confidence_score', 0):.3f}")
                print(f"  压力水平: {analysis.get('stress_level', 0):.3f}")
                print(f"  参与度: {analysis.get('engagement_score', 0):.3f}")
                print(f"  总体印象: {analysis.get('overall_impression', 'N/A')}")
                print("  改进建议:")
                for suggestion in analysis.get('suggestions', []):
                    print(f"    - {suggestion}")
        else:
            print(f"✗ API调用失败: {response.text}")
            
    except Exception as e:
        print(f"✗ 请求异常: {e}")
    
    # 测试用例3: 错误处理 - 无效图像数据
    print("\n3. 测试错误处理...")
    
    payload = {
        "image_data": "invalid_base64_data",
        "format": "jpeg",
        "detect_faces": True,
        "analyze_emotion": False,
        "analyze_micro_expression": False,
        "analysis_mode": "general"
    }
    
    try:
        response = requests.post(f"{server_url}/api/image", 
                               json=payload, 
                               timeout=30)
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code != 200:
            print("✓ 错误处理正常")
            result = response.json()
            print(f"错误信息: {result.get('error', 'N/A')}")
        else:
            print("? 应该返回错误，但返回了成功")
            
    except Exception as e:
        print(f"请求异常: {e}")

def test_multipart_form_upload():
    """测试multipart/form-data上传"""
    print("\n4. 测试multipart文件上传...")
    
    server_url = "http://localhost:8081"
    
    # 创建测试图像文件
    image_data = create_test_image()
    
    # 使用multipart/form-data上传
    files = {
        'image': ('test_face.jpg', image_data, 'image/jpeg')
    }
    
    data = {
        'detect_faces': 'true',
        'analyze_emotion': 'true',
        'analyze_micro_expression': 'false',
        'analysis_mode': 'interview'
    }
    
    try:
        response = requests.post(f"{server_url}/api/image", 
                               files=files,
                               data=data,
                               timeout=30)
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✓ multipart上传成功")
            print(f"检测到人脸数: {len(result.get('faces', []))}")
            
            if result.get('faces'):
                face = result['faces'][0]
                print(f"第一个人脸情绪: {face.get('emotion', 'N/A')}")
        else:
            print(f"✗ multipart上传失败: {response.text}")
            
    except Exception as e:
        print(f"✗ multipart上传异常: {e}")

if __name__ == "__main__":
    print("开始测试图像识别API...")
    print("请确保服务器正在运行 (./start_server.sh)")
    
    # 等待用户确认
    input("按回车键开始测试...")
    
    test_image_recognition_api()
    test_multipart_form_upload()
    
    print("\n=== 测试完成 ===")
