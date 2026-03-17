import psycopg2
from app.database.database import DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD

def check_admin():
    conn = psycopg2.connect(
        host=DATABASE_HOST,
        port=DATABASE_PORT,
        database=DATABASE_NAME,
        user=DATABASE_USER,
        password=DATABASE_PASSWORD
    )
    cur = conn.cursor()
    cur.execute("SELECT email, role, status FROM auth.users WHERE email='admin@itsm.com';")
    user = cur.fetchone()
    if user:
        print(f"User: {user[0]}, Role: {user[1]}, Status: {user[2]}")
    else:
        print("Admin user not found.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    check_admin()
