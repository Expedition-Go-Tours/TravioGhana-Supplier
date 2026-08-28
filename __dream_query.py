import sqlite3, json, sys
from datetime import datetime

DB = r"C:\Users\itope\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
c = conn.cursor()

query_type = sys.argv[1] if len(sys.argv) > 1 else "user_msgs"
session_id = sys.argv[2] if len(sys.argv) > 2 else None

if query_type == "user_msgs" and session_id:
    c.execute("""SELECT m.id, json_extract(m.data, '$.role') as role, p.time_created,
                 substr(json_extract(p.data, '$.text'), 1, 500) as text_preview
                 FROM message m JOIN part p ON p.message_id = m.id
                 WHERE m.session_id = ?
                 AND json_extract(m.data, '$.role') = 'user'
                 AND json_extract(p.data, '$.type') = 'text'
                 ORDER BY m.time_created""", (session_id,))
    rows = c.fetchall()
    for r in rows:
        ts = datetime.fromtimestamp(r[2]/1000).strftime('%H:%M')
        text = r[3][:400] if r[3] else ''
        print(f'--- user ({ts}) ---')
        print(text)
        print()

elif query_type == "assistant_msgs" and session_id:
    c.execute("""SELECT m.id, json_extract(m.data, '$.role') as role, p.time_created,
                 substr(json_extract(p.data, '$.text'), 1, 500) as text_preview
                 FROM message m JOIN part p ON p.message_id = m.id
                 WHERE m.session_id = ?
                 AND json_extract(m.data, '$.role') = 'assistant'
                 AND json_extract(p.data, '$.type') = 'text'
                 ORDER BY m.time_created""", (session_id,))
    rows = c.fetchall()
    for r in rows:
        ts = datetime.fromtimestamp(r[2]/1000).strftime('%H:%M')
        text = r[3][:500] if r[3] else ''
        print(f'--- assistant ({ts}) ---')
        print(text)
        print()

elif query_type == "tool_calls" and session_id:
    c.execute("""SELECT m.id, json_extract(m.data, '$.role') as role, p.time_created,
                 json_extract(p.data, '$.tool') as tool,
                 substr(p.data, 1, 600) as data_preview
                 FROM message m JOIN part p ON p.message_id = m.id
                 WHERE m.session_id = ?
                 AND json_extract(p.data, '$.type') = 'tool'
                 ORDER BY m.time_created""", (session_id,))
    rows = c.fetchall()
    for r in rows:
        ts = datetime.fromtimestamp(r[3]/1000).strftime('%H:%M')
        tool = r[4] or 'unknown'
        print(f'--- {r[1]} ({ts}) tool={tool} ---')
        print(r[5][:300])
        print()

elif query_type == "user_search":
    # Search all user messages for keywords
    keyword = sys.argv[2] if len(sys.argv) > 2 else ""
    c.execute("""SELECT s.id as sid, s.title, s.time_created,
                 json_extract(m.data, '$.role') as role, p.time_created as msg_time,
                 substr(json_extract(p.data, '$.text'), 1, 600) as text_preview
                 FROM session s
                 JOIN message m ON m.session_id = s.id
                 JOIN part p ON p.message_id = m.id
                 WHERE s.project_id = 'c5edeb6b-9672-47d8-974a-0f240496dc96'
                 AND json_extract(m.data, '$.role') = 'user'
                 AND json_extract(p.data, '$.type') = 'text'
                 AND json_extract(p.data, '$.text') LIKE ?
                 ORDER BY s.time_created DESC
                 LIMIT 30""", (f'%{keyword}%',))
    rows = c.fetchall()
    for r in rows:
        try:
            ts = datetime.fromtimestamp(int(r[4])/1000).strftime('%Y-%m-%d %H:%M')
        except (TypeError, ValueError):
            ts = str(r[4])[:16]
        print(f'[{r[0]}] {ts} | {r[1][:60]}')
        text = r[5][:300] if r[5] else ''
        print(f'  {text}')
        print()

conn.close()
