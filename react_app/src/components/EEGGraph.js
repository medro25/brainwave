import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const EEGGraph = ({ eegData, selectedChannel }) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (!selectedChannel || !eegData.data.length || !eegData.timestamps.length) return;

    const channelIndex = eegData.selected_channels.indexOf(selectedChannel);
    if (channelIndex === -1) {
      console.warn(`⚠️ Channel ${selectedChannel} not found.`);
      setChartData(null);
      return;
    }

    const dataset = {
      label: selectedChannel,
      data: eegData.data[channelIndex],
      borderColor: "blue",
      borderWidth: 1.5,
      tension: 0.1,
      pointRadius: 0,
    };

    setChartData({
      labels: eegData.timestamps,
      datasets: [dataset],
    });

  }, [eegData, selectedChannel]);

  return (
    <div style={{ marginTop: "20px", width: "100%", maxWidth: "90vw" }}>
      <h2>EEG Data for {selectedChannel}</h2>
      {chartData ? (
        <div style={{
          width: "100%",
          height: "40vh",
          minHeight: "300px",
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "20px"
        }}>
          <Line data={chartData} options={{ maintainAspectRatio: false }} />
        </div>
      ) : (
        <p>No data available for {selectedChannel}.</p>
      )}
    </div>
  );
};

export default EEGGraph;
