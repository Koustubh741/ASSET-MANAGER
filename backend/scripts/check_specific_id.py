import psycopg2
from app.database.database import DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD

def check_id():
    conn = psycopg2.connect(
        host=DATABASE_HOST,
        port=DATABASE_PORT,
        database=DATABASE_NAME,
        user=DATABASE_USER,
        password=DATABASE_PASSWORD
    )
    cur = conn.cursor()
    cur.execute("SELECT id, email, role FROM auth.users WHERE id='8fe42571-d0df-4028-ac04-80db5b4adc5d';")
    user = cur.fetchone()
    if user:
        print(f"ID: {user[0]}, Email: {user[1]}, Role: {user[2]}")
    else:
        print("User not found by ID.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    check_id()
