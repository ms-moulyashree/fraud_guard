import bcrypt
pw = 'Demo@1234'
h = '$2b$12$EgTyxW9brNzCT5mf3sb57.FfYl/TpHcGUyckuOpP2ZJCJkq1Z2INK'
print('match:', bcrypt.checkpw(pw.encode(), h.encode()))