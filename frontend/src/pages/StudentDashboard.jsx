import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import AttendanceChart from "../components/AttendanceChart";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ fromDate: "", toDate: "", reason: "" });
  const [message, setMessage] = useState("");

  const loadData = async () => {
    const [summaryRes, historyRes, leavesRes] = await Promise.all([
      api.get("/student/attendance/summary"),
      api.get("/student/attendance"),
      api.get("/student/leaves"),
    ]);
    setSummary(summaryRes.data);
    setHistory(historyRes.data);
    setLeaves(leavesRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitLeave = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await api.post("/student/leaves", leaveForm);
      setMessage("Leave request submitted.");
      setLeaveForm({ fromDate: "", toDate: "", reason: "" });
      loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to submit leave");
    }
  };

  return (
    <div>
      <nav className="navbar">
        <span>Attendance System — Student</span>
        <div>
          <span style={{ marginRight: 16 }}>{user?.name}</span>
          <button className="secondary" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="container">
        {summary && (
          <div className="stat-grid">
            <div className="stat-box">
              <div className="value">{summary.attendancePercent.toFixed(1)}%</div>
              <div>Attendance</div>
            </div>
            <div className="stat-box">
              <div className="value">{summary.present}</div>
              <div>Present</div>
            </div>
            <div className="stat-box">
              <div className="value">{summary.absent}</div>
              <div>Absent</div>
            </div>
            <div className="stat-box">
              <div className="value">{summary.late}</div>
              <div>Late</div>
            </div>
          </div>
        )}

        <div className="card">
          <h3>Attendance Breakdown</h3>
          {summary && (
            <AttendanceChart present={summary.present} absent={summary.absent} late={summary.late} />
          )}
        </div>

        <div className="card">
          <h3>Attendance History</h3>
          <table>
            <thead>
              <tr><th>Date</th><th>Status</th><th>Remarks</th></tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r._id}>
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                  <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                  <td>{r.remarks || "-"}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={3}>No records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Apply for Leave</h3>
          {message && <p>{message}</p>}
          <form onSubmit={submitLeave}>
            <div className="form-row">
              <input
                type="date"
                value={leaveForm.fromDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                required
              />
              <input
                type="date"
                value={leaveForm.toDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <textarea
                placeholder="Reason for leave"
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                required
                style={{ flex: 1 }}
              />
            </div>
            <button type="submit">Submit Request</button>
          </form>
        </div>

        <div className="card">
          <h3>My Leave Requests</h3>
          <table>
            <thead>
              <tr><th>From</th><th>To</th><th>Reason</th><th>Status</th></tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l._id}>
                  <td>{new Date(l.fromDate).toLocaleDateString()}</td>
                  <td>{new Date(l.toDate).toLocaleDateString()}</td>
                  <td>{l.reason}</td>
                  <td><span className={`badge ${l.status}`}>{l.status}</span></td>
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr><td colSpan={4}>No leave requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
