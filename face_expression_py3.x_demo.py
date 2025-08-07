# -*- coding: utf-8 -*-
import requests
import time
import hashlib
import base64
import os
import json
""" 
  人脸特征分析表情WebAPI接口调用示例接口文档(必看)：https://doc.xfyun.cn/rest_api/%E4%BA%BA%E8%84%B8%E7%89%B9%E5%BE%81%E5%88%86%E6%9E%90-%E8%A1%A8%E6%83%85.html
  图片属性：png、jpg、jpeg、bmp、tif图片大小不超过800k
  (Very Important)创建完webapi应用添加服务之后一定要设置ip白名单，找到控制台--我的应用--设置ip白名单，如何设置参考：http://bbs.xfyun.cn/forum.php?mod=viewthread&tid=41891
  错误码链接：https://www.xfyun.cn/document/error-code (code返回错误码时必看)
  @author iflytek
"""
# 人脸特征分析表情webapi接口地址
URL = "http://tupapi.xfyun.cn/v1/expression"
# 应用ID  (必须为webapi类型应用，并人脸特征分析服务，参考帖子如何创建一个webapi应用：http://bbs.xfyun.cn/forum.php?mod=viewthread&tid=36481)
APPID = "82e7fa93"
# 接口密钥 (webapi类型应用开通人脸特征分析服务后，控制台--我的应用---人脸特征分析---服务的apikey)
API_KEY = "891ffce5b4b74fd82c3dbb65203c7614"
ImageName = "img.jpg"
# ImageUrl = "http://hbimg.b0.upaiyun.com/a09289289df694cd6157f997ffa017cc44d4ca9e288fb-OehMYA_fw658"
FilePath = os.path.join(os.path.dirname(__file__), "img.jpg")
# 图片数据可以通过两种方式上传，第一种在请求头设置image_url参数，第二种将图片二进制数据写入请求体中。若同时设置，以第一种为准。
# 此demo使用第二种方式进行上传本地图片文件，将图片二进制数据写入请求体中。
def getHeader(image_name):
    curTime = str(int(time.time()))
    param = "{\"image_name\":\"" + image_name + "\"}"
    paramBase64 = base64.b64encode(param.encode('utf-8'))
    tmp = str(paramBase64, 'utf-8')
    m2 = hashlib.md5()
    m2.update((API_KEY + curTime + tmp).encode('utf-8'))
    checkSum = m2.hexdigest()

    header = {
        'X-CurTime': curTime,
        'X-Param': paramBase64,
        'X-Appid': APPID,
        'X-CheckSum': checkSum,
    }
    return header


def getBody(filePath):
    binfile = open(filePath, 'rb')
    data = binfile.read()
    binfile.close()
    return data


# 检查本地图片文件是否存在
if os.path.exists(FilePath):
    r = requests.post(URL, headers=getHeader(ImageName), data=getBody(FilePath))
    
    # 解析并美化显示结果
    try:
        result = json.loads(r.content.decode('utf-8'))
        
        print("=" * 50)
        print("人脸表情分析结果")
        print("=" * 50)
        
        print(f"状态码: {result['code']}")
        print(f"描述: {result['desc']}")
        print(f"会话ID: {result['sid']}")
        print()
        
        if result['code'] == 0 and result['data']['fileList']:
            file_info = result['data']['fileList'][0]
            
            print("图片分析详情:")
            print(f"  文件名: {file_info['name']}")
            print(f"  处理状态: {'成功' if file_info['code'] == 0 else '失败'}")
            print(f"  主要表情: {file_info['label']}")
            print(f"  置信度: {file_info['rate']:.4f}")
            print()
            
            # 表情分类说明
            expressions = [
                "愤怒 (Anger)",
                "厌恶 (Disgust)", 
                "快乐 (Happiness)",
                "中性 (Neutral)",
                "难过 (Sadness)",
                "惊讶 (Surprise)",
                "恐惧 (Fear)",
                "轻蔑 (Contempt)"
            ]
            
            print("各表情的置信度得分:")
            rates = file_info['rates']
            for i, (expr, rate) in enumerate(zip(expressions, rates)):
                marker = " ← 主要表情" if i == file_info['label'] else ""
                print(f"  {i}: {expr:<20} - {rate:.6f}{marker}")
            
            print()
            print("统计信息:")
            statistic = result['data']['statistic']
            total_faces = sum(statistic)
            print(f"  检测到的总人脸数: {total_faces}")
            
            if total_faces > 0:
                print("  各表情人脸分布:")
                for i, (expr, count) in enumerate(zip(expressions, statistic)):
                    if count > 0:
                        print(f"    {expr}: {count}个人脸")
        else:
            print("分析失败或未检测到人脸")
            
    except json.JSONDecodeError:
        print("API返回结果解析失败")
        print("原始返回内容:", r.content)
    except Exception as e:
        print(f"处理结果时出错: {e}")
        print("原始返回内容:", r.content)
        
else:
    print(f"错误：找不到图片文件 {FilePath}")
    print("请确保当前目录下存在 img.jpg 文件")

