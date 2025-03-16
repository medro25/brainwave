import React, { useState, useEffect, useRef } from "react";
import EEGGraph from "./components/EEGGraph";

const App = () => {
  const [socket, setSocket] = useState(null);
  const [streams, setStreams] = useState([]);
  const [selectedStream, setSelectedStream] = useState("");
  const [channels, setChannels] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [eegData, setEegData] = useState({
    data: [],
    timestamps: [],
    selected_channels: [],
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8765");

    ws.onopen = () => console.log("✅ Connected to WebSocket server");

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("📩 Received from server:", message);

        if (message.streams) setStreams(message.streams);
        if (message.channels) setChannels(message.channels);
        if (message.data && message.timestamps && message.selected_channels) {
          setEegData({
            data: message.data,
            timestamps: message.timestamps,
            selected_channels: message.selected_channels,
          });
        }
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => console.error("❌ WebSocket error:", error);
    ws.onclose = () => console.log("🛑 WebSocket connection closed");

    setSocket(ws);
    return () => ws.close();
  }, []);

  const handleStreamSelect = (event) => {
    const streamName = event.target.value;
    setSelectedStream(streamName);
    setSelectedChannels([]); // Reset channels when stream changes
    if (socket && streamName) {
      socket.send(JSON.stringify({ stream_name: streamName }));
      console.log(`📤 Sent selected stream: ${streamName}`);
    }
  };

  const handleChannelToggle = (channel) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ padding: "20px", maxWidth: "100vw" }}>
      <h1>EEG Visualizer</h1>

      {/* Stream Selection */}
      <div>
        <label><strong>Select EEG Stream:</strong></label>
        <select value={selectedStream} onChange={handleStreamSelect} style={{ marginLeft: "10px" }}>
          <option value="">-- Choose a Stream --</option>
          {streams.map((stream, index) => (
            <option key={index} value={stream.name}>{stream.name}</option>
          ))}
        </select>
      </div>

      {/* Channel Selection as a Dropdown with Checkboxes */}
      {channels.length > 0 && (
        <div style={{ marginTop: "20px", position: "relative" }}>
          <label><strong>Select EEG Channels:</strong></label>
          <div 
            style={{ 
              border: "1px solid #ccc", 
              padding: "10px", 
              cursor: "pointer", 
              display: "inline-block", 
              backgroundColor: "#f9f9f9",
              userSelect: "none"
            }} 
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {selectedChannels.length > 0 ? selectedChannels.join(", ") : "Select Channels"} ▼
          </div>

          {dropdownOpen && (
            <div 
              ref={dropdownRef}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                backgroundColor: "white",
                border: "1px solid #ccc",
                maxHeight: "200px",
                overflowY: "auto",
                padding: "10px",
                width: "200px",
                zIndex: 1000,
              }}
            >
              {channels.map((channel, index) => (
                <label key={index} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 0" }}>
                  <input
                    type="checkbox"
                    checked={selectedChannels.includes(channel)}
                    onChange={() => handleChannelToggle(channel)}
                  />
                  {channel}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EEG Graphs for Each Selected Channel */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        {selectedChannels.length > 0 && selectedChannels.map((channel) => (
          <EEGGraph key={channel} eegData={eegData} selectedChannel={channel} />
        ))}
      </div>
    </div>
  );
};

export default App;
