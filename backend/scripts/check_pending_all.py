import psycopg2
from app.database.database import DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD

def check_pending():
    conn = psycopg2.connect(
        host=DATABASE_HOST,
        port=DATABASE_PORT,
        database=DATABASE_NAME,
        user=DATABASE_USER,
        password=DATABASE_PASSWORD
    )
    cur = conn.cursor()
    cur.execute("SELECT email, status, role FROM auth.users WHERE status='PENDING';")
    users = cur.fetchall()
    print(f"Pending Users ({len(users)}):")
    for u in users:
        print(f"- {u[0]} (Role: {u[2]})")
    cur.close()
    conn.close()

if __name__ == "__main__":
    check_pending()
