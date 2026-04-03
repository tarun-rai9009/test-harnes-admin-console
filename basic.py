from openai import OpenAI

client = OpenAI()

try:
    client.models.list()
    print("API Key is valid!")
except Exception as e:
    print(f"Error: {e}")
