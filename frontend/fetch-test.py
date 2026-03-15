import urllib.request

try:
    with urllib.request.urlopen("http://localhost:3000/enterprise") as response:
        html = response.read().decode('utf-8')
        print(html)
except Exception as e:
    print("Error:", e)
