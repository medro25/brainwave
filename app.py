import asyncio
import json
import logging
import websockets
import numpy as np
from data.eeg_data_simulator import LSLDataSimulator
from data.lsl_stream_connector import LSLStreamConnector

logging.basicConfig(level=logging.DEBUG)

class EEGWebSocketServer:
    def __init__(self, host="0.0.0.0", port=8765, bufsize=200):
        self.host = host
        self.port = port
        self.bufsize = bufsize
        self.simulator = LSLDataSimulator()
        self.connector = None

    async def websocket_handler(self, websocket):
        logging.info("✅ [WebSocket] New client connected.")

        try:
            # ✅ Send available EEG streams
            available_streams = self.simulator.find_streams()
            if not available_streams:
                logging.warning("⚠️ No EEG streams found!")
                await websocket.send(json.dumps({"error": "No streams available."}))
                return

            stream_info = [{"name": stream.name()} for stream in available_streams]
            await websocket.send(json.dumps({"streams": stream_info}))

            # ✅ Receive stream selection
            message = await websocket.recv()
            selected_stream_data = json.loads(message)
            selected_stream_name = selected_stream_data.get("stream_name")

            if not selected_stream_name:
                logging.error("❌ Invalid stream name received.")
                await websocket.send(json.dumps({"error": "Invalid stream name."}))
                return

            # ✅ Connect to EEG stream
            self.connector = LSLStreamConnector(bufsize=self.bufsize)
            if not self.connector.connect(selected_stream_name):
                logging.error(f"❌ Failed to connect to stream: {selected_stream_name}")
                await websocket.send(json.dumps({"error": "Failed to connect to stream."}))
                return

            # ✅ Send all available EEG channels
            available_channels = self.connector.ch_names
            await websocket.send(json.dumps({"channels": available_channels}))

            # ✅ Start streaming all channels without waiting for selection
            await self.stream_real_time(websocket, available_channels)

        except websockets.exceptions.ConnectionClosed:
            logging.warning("🛑 WebSocket connection closed.")

        except Exception as e:
            logging.error(f"❌ WebSocket error: {e}")

    async def stream_real_time(self, websocket, all_channels):
        interval = self.connector.bufsize / self.connector.sfreq if self.connector.sfreq else 0.1
        logging.info("📡 Streaming EEG data to client...")

        try:
            while True:
                data, timestamps = self.connector.get_data(winsize=1, picks=all_channels)

                if data is None or timestamps is None or len(timestamps) == 0 or len(data) == 0:
                    logging.warning("⚠️ No valid EEG data received from the stream!")
                    continue

                message = {
                    "timestamps": timestamps.tolist() if isinstance(timestamps, np.ndarray) else list(timestamps),
                    "data": data.tolist() if isinstance(data, np.ndarray) else list(data),
                    "selected_channels": all_channels
                }
                await websocket.send(json.dumps(message))
                logging.info("📡 Sent EEG data.")

                await asyncio.sleep(interval)

        except websockets.exceptions.ConnectionClosed:
            logging.warning("🛑 WebSocket connection closed.")
            self.connector.stream.disconnect()

    async def start_server(self):
        logging.info(f"🚀 WebSocket server running on ws://{self.host}:{self.port}...")
        async with websockets.serve(self.websocket_handler, self.host, self.port):
            await asyncio.Future()  # Keep running

    def run(self):
        logging.info("\n🔹 Starting EEG WebSocket Server...\n")
        asyncio.run(self.start_server())

if __name__ == "__main__":
    eeg_server = EEGWebSocketServer()
    eeg_server.run()
