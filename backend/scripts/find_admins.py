import psycopg2
from app.database.database import DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD

def find_admins():
    conn = psycopg2.connect(
        host=DATABASE_HOST,
        port=DATABASE_PORT,
        database=DATABASE_NAME,
        user=DATABASE_USER,
        password=DATABASE_PASSWORD
    )
    cur = conn.cursor()
    cur.execute("SELECT email, role FROM auth.users WHERE role LIKE '%ADMIN%';")
    users = cur.fetchall()
    print("Admins in DB:")
    for u in users:
        print(f"- {u[0]} ({u[1]})")
    cur.close()
    conn.close()

if __name__ == "__main__":
    find_admins()
