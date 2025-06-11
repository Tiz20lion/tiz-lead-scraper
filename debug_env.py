
import os

print("=== Environment Variables Debug ===")
print(f"OPENROUTER_API_KEY: {os.getenv('OPENROUTER_API_KEY', 'NOT FOUND')}")
print(f"All environment variables containing 'OPENROUTER':")
for key, value in os.environ.items():
    if 'OPENROUTER' in key.upper():
        print(f"  {key}: {value[:10]}..." if value else f"  {key}: {value}")
        
print(f"All environment variables containing 'API':")
for key, value in os.environ.items():
    if 'API' in key.upper():
        print(f"  {key}: {value[:10]}..." if value else f"  {key}: {value}")
