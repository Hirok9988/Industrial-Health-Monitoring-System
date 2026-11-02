import asyncio
import websockets
import json
import threading
import requests
import time

async def websocket_client():
    uri = "ws://localhost:8000/ws/machines/MACHINE_01"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to WebSocket for MACHINE_01")
            
            # Start background thread to send a test POST request after a brief delay
            threading.Thread(target=send_post_request, daemon=True).start()
            
            print("Waiting for incoming messages...")
            # Wait for 1 message
            response = await websocket.recv()
            print("\nReceived via WebSocket:")
            print(json.dumps(json.loads(response), indent=2))
            
    except Exception as e:
        print(f"WebSocket error: {e}")

def send_post_request():
    time.sleep(1) # wait for WS connection
    print("Sending POST request to /api/sensor-data...")
    url = "http://localhost:8000/api/sensor-data"
    payload = {
        "machine_id": "MACHINE_01",
        "temperature": 35.0,
        "ambient_temp": 30.0,
        "humidity": 50.0,
        "current": 1.0,
        "rpm": 1800.0,
        "vibration": 0.2
    }
    try:
        res = requests.post(url, json=payload)
        print(f"POST Response: {res.status_code}")
    except Exception as e:
        print(f"POST error: {e}")

if __name__ == "__main__":
    asyncio.run(websocket_client())
