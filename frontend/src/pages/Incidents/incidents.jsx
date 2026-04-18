import React, { useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiClock,
  FiUser,
  FiMapPin,
  FiCheckCircle,
  FiXCircle
} from "react-icons/fi";
import "./incidents.css";

const BASE = "http://localhost:8081/api";

export default function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem("token");

  const fetchIncidents = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${BASE}/incidents`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        credentials: "include"
      });

      const data = await res.json();
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const severityColor = (s) => {
    switch (s) {
      case "critical": return "#ef4444";
      case "high": return "#f97316";
      case "medium": return "#f59e0b";
      default: return "#10b981";
    }
  };
  const updateStatus = async (id, status) => {
  try {
    await fetch(`${BASE}/incidents/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ status })
    });

    // refresh list
    fetchIncidents();
  } catch (err) {
    console.error(err);
  }
};

  return (
  <div className="inc-layout">
    <div className="inc-main">

      {/* HEADER */}
      <div className="inc-header">
        <h1 className="inc-title">Incident Reports</h1>
        <p className="inc-sub">Worker-reported field incidents overview</p>
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="inc-loading">Loading incidents...</div>
      ) : incidents.length === 0 ? (
        /* EMPTY STATE */
        <div className="inc-empty-box">
          <FiCheckCircle size={48} />
          <h3>No Incidents Reported</h3>
          <p>Everything looks safe and under control 🌿</p>
        </div>
      ) : (
        /* GRID */
        <div className="inc-grid">
          {incidents.map((i) => (
            <div className="inc-card" key={i.report_id}>

              {/* LEFT COLOR STRIP */}
              <div
                className="inc-strip"
                style={{ background: severityColor(i.severity) }}
              />

              {/* CONTENT */}
              <div className="inc-content">

                <div className="inc-top">
                  <h3 className="inc-title-text">{i.title}</h3>

                  <span
                    className="inc-badge"
                    style={{
                      background: severityColor(i.severity) + "22",
                      color: severityColor(i.severity)
                    }}
                  >
                    {i.severity}
                  </span>
                </div>

                <p className="inc-desc">{i.description}</p>

                <div className="inc-info">
                  <div><FiMapPin /> {i.field_name}</div>
                  <div><FiUser /> {i.reporter_name}</div>
                  <div><FiClock /> {new Date(i.created_at).toLocaleString()}</div>
                </div>

                <div className="inc-actions">
  <span className={`inc-status ${i.status}`}>
    {i.status}
  </span>

  <div className="inc-buttons">
    <button
      className="btn-progress"
      onClick={() => updateStatus(i.report_id, "in_progress")}
      disabled={i.status === "in_progress"}
    >
      <FiClock /> In Progress
    </button>

    <button
      className="btn-resolve"
      onClick={() => updateStatus(i.report_id, "resolved")}
      disabled={i.status === "resolved"}
    >
      <FiCheckCircle /> Resolve
    </button>

    <button
      className="btn-reset"
      onClick={() => updateStatus(i.report_id, "pending")}
      disabled={i.status === "pending"}
    >
    <FiXCircle /> Reset
    </button>
  </div>
</div>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  </div>
);
}