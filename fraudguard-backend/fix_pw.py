import asyncio, asyncpg

async def fix():
    conn = await asyncpg.connect('postgresql://postgres:123Yah00@localhost/fraudguard')
    pw_hash = '$2b$12$EgTyxW9brNzCT5mf3sb57.FfYl/TpHcGUyckuOpP2ZJCJkq1Z2INK'
    for email in ['priya.sharma@company.com', 'rahul.verma@company.com']:
        r = await conn.execute('UPDATE users SET password_hash = $1 WHERE email = $2', pw_hash, email)
        print(f'{email}: {r}')
    await conn.close()

asyncio.run(fix())