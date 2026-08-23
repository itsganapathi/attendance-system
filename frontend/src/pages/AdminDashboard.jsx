import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import AttendanceChart from "../components/AttendanceChart";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [newStudent, setNewStudent] = useState({ name: "", email: "", password: "", rollNumber: "", department: "" });
  const [attendanceForm, setAttendanceForm] = useState({ studentId: "", date: "", status: "present", remarks: "" });
  const [message, setMessage] = useState("");

  const loadData = async () => {
    const [studentsRes, summaryRes, leavesRes] = await Promise.all([
      api.get("/admin/students"),
      api.get("/admin/reports/summary"),
      api.get("/admin/leaves"),
    ]);
    setStudents(studentsRes.data);
    setSummary(summaryRes.data);
    setLeaves(leavesRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const addStudent = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await api.post("/admin/students", newStudent);
      setMessage("Student added.");
      setNewStudent({ name: "", email: "", password: "", rollNumber: "", department: "" });
      loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to add student");
    }
  };

  const removeStudent = async (id) => {
    if (!confirm("Remove this student?")) return;
    await api.delete(`/admin/students/${id}`);
    loadData();
  };

  const markAttendance = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await api.post("/admin/attendance", attendanceForm);
      setMessage("Attendance recorded.");
      loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to mark attendance");
    }
  };

  const reviewLeave = async (id, status) => {
    await api.patch(`/admin/leaves/${id}`, { status });
    loadData();
  };

  const exportCSV = () => {
    // Downloads via a direct navigation so the browser handles the file response
    const token = localStorage.getItem("token");
    fetch("/api/admin/attendance/export", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "attendance-report.csv";
        a.click();
        window.URL.revokeObjectURL(url);
      });
  };

  const totals = summary.reduce(
    (acc, s) => ({
      present: acc.present + s.present,
      absent: acc.absent + s.absent,
      late: acc.late + s.late,
    }),
    { present: 0, absent: 0, late: 0 }
  );

  return (
    <div>
      <nav className="navbar">
        <span>Attendance System — Admin</span>
        <div>
          <span style={{ marginRight: 16 }}>{user?.name}</span>
          <button className="secondary" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="container">
        {message && <p className="card">{message}</p>}

        <div className="card">
          <h3>Overall Attendance</h3>
          <AttendanceChart present={totals.present} absent={totals.absent} late={totals.late} />
        </div>

        <div className="card">
          <h3>Add Student</h3>
          <form onSubmit={addStudent}>
            <div className="form-row">
              <input placeholder="Name" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} required />
              <input placeholder="Email" type="email" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} required />
              <input placeholder="Password" type="password" value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} required minLength={6} />
            </div>
            <div className="form-row">
              <input placeholder="Roll Number / Employee ID" value={newStudent.rollNumber} onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })} />
              <input placeholder="Department" value={newStudent.department} onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })} />
              <button type="submit">Add</button>
            </div>
          </form>
        </div>

        <div className="card">
          <h3>Mark Attendance</h3>
          <form onSubmit={markAttendance}>
            <div className="form-row">
              <select value={attendanceForm.studentId} onChange={(e) => setAttendanceForm({ ...attendanceForm, studentId: e.target.value })} required>
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                ))}
              </select>
              <input type="date" value={attendanceForm.date} onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })} required />
              <select value={attendanceForm.status} onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
              </select>
              <input placeholder="Remarks (optional)" value={attendanceForm.remarks} onChange={(e) => setAttendanceForm({ ...attendanceForm, remarks: e.target.value })} />
              <button type="submit">Mark</button>
            </div>
          </form>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Students & Attendance %</h3>
            <button onClick={exportCSV}>Export CSV</button>
          </div>
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Present</th><th>Absent</th><th>Late</th><th>%</th><th>Remove</th></tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const stat = summary.find((x) => x.studentId === s._id);
                return (
                  <tr key={s._id}>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td>{stat?.present ?? 0}</td>
                    <td>{stat?.absent ?? 0}</td>
                    <td>{stat?.late ?? 0}</td>
                    <td>{stat ? stat.attendancePercent.toFixed(1) : "0.0"}%</td>
                    <td><button className="danger" onClick={() => removeStudent(s._id)}>Remove</button></td>
                  </tr>
                );
              })}
              {students.length === 0 && <tr><td colSpan={7}>No students yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Leave Requests</h3>
          <table>
            <thead>
              <tr><th>Student</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l._id}>
                  <td>{l.student?.name}</td>
                  <td>{new Date(l.fromDate).toLocaleDateString()}</td>
                  <td>{new Date(l.toDate).toLocaleDateString()}</td>
                  <td>{l.reason}</td>
                  <td><span className={`badge ${l.status}`}>{l.status}</span></td>
                  <td>
                    {l.status === "pending" ? (
                      <>
                        <button onClick={() => reviewLeave(l._id, "approved")} style={{ marginRight: 6 }}>Approve</button>
                        <button className="danger" onClick={() => reviewLeave(l._id, "rejected")}>Reject</button>
                      </>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && <tr><td colSpan={6}>No leave requests yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
