#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db, InterviewRecord
import json

def debug_records():
    with app.app_context():
        records = InterviewRecord.query.all()
        print(f"找到 {len(records)} 条面试记录")
        
        for i, record in enumerate(records):
            print(f"\n=== 记录 {i+1} ===")
            print(f"ID: {record.id}")
            print(f"用户ID: {record.user_id}")
            print(f"职位: {record.position}")
            print(f"创建时间: {record.created_at}")
            print(f"问题: {record.questions}")
            print(f"答案: {record.answers}")
            print(f"结果: {record.result}")
            
            # 尝试解析result
            try:
                if record.result:
                    parsed = json.loads(record.result)
                    print(f"解析后的结果: {json.dumps(parsed, indent=2, ensure_ascii=False)}")
                    
                    if 'abilities' in parsed:
                        print("✓ 包含abilities数据")
                    else:
                        print("✗ 不包含abilities数据")
                        
                    if 'suggestions' in parsed:
                        print("✓ 包含suggestions数据")
                    else:
                        print("✗ 不包含suggestions数据")
                else:
                    print("✗ result字段为空")
            except Exception as e:
                print(f"✗ 解析result失败: {e}")

if __name__ == "__main__":
    debug_records() 