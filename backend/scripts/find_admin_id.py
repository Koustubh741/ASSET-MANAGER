import psycopg2
from app.database.database import DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD

def find_admin_id():
    conn = psycopg2.connect(
        host=DATABASE_HOST,
        port=DATABASE_PORT,
        database=DATABASE_NAME,
        user=DATABASE_USER,
        password=DATABASE_PASSWORD
    )
    cur = conn.cursor()
    cur.execute("SELECT id, email, role FROM auth.users WHERE email='admin@itsm.com';")
    user = cur.fetchone()
    if user:
        print(f"ID: {user[0]}, Email: {user[1]}, Role: {user[2]}")
    else:
        print("Admin user not found.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    find_admin_id()
