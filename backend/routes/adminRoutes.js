const express = require("express");
const bcrypt = require("bcryptjs");
const { Parser } = require("json2csv");
const supabase = require("../config/supabase");
const { protect, isAdmin } = require("../middleware/auth");

const router = express.Router();

// All routes below require a logged-in admin
router.use(protect, isAdmin);

// ---------- Student management ----------

// @route   POST /api/admin/students
// @desc    Add a new student/employee
router.post("/students", async (req, res) => {
  try {
    const { name, email, password, rollNumber, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const { data: student, error } = await supabase
      .from("users")
      .insert({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: "student",
        roll_number: rollNumber || null,
        department: department || null,
      })
      .select("id, name, email, role, roll_number, department, is_active, created_at")
      .single();

    if (error) throw error;
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ message: "Failed to add student", error: err.message });
  }
});

// @route   GET /api/admin/students
// @desc    List all students
router.get("/students", async (req, res) => {
  const { data: students, error } = await supabase
    .from("users")
    .select("id, name, email, role, roll_number, department, is_active, created_at")
    .eq("role", "student")
    .order("name", { ascending: true });

  if (error) return res.status(500).json({ message: "Failed to load students", error: error.message });
  res.json(students);
});

// @route   DELETE /api/admin/students/:id
// @desc    Remove a student
router.delete("/students/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .delete()
    .eq("id", req.params.id)
    .eq("role", "student")
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ message: "Failed to remove student", error: error.message });
  if (!data) return res.status(404).json({ message: "Student not found" });
  res.json({ message: "Student removed", id: req.params.id });
});

// ---------- Attendance ----------

// @route   POST /api/admin/attendance
// @desc    Mark attendance for one student on a given date (upsert)
// body: { studentId, date, status, remarks }
router.post("/attendance", async (req, res) => {
  try {
    const { studentId, date, status, remarks } = req.body;
    if (!studentId || !date || !status) {
      return res.status(400).json({ message: "studentId, date and status are required" });
    }

    const { data: record, error } = await supabase
      .from("attendance")
      .upsert(
        { student_id: studentId, date, status, remarks: remarks || null, marked_by: req.user.id },
        { onConflict: "student_id,date" }
      )
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(record);
  } catch (err) {
    res.status(500).json({ message: "Failed to mark attendance", error: err.message });
  }
});

// @route   POST /api/admin/attendance/bulk
// @desc    Mark attendance for many students at once for a given date
// body: { date, records: [{ studentId, status, remarks }] }
router.post("/attendance/bulk", async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ message: "date and records[] are required" });
    }

    const rows = records.map((r) => ({
      student_id: r.studentId,
      date,
      status: r.status,
      remarks: r.remarks || null,
      marked_by: req.user.id,
    }));

    const { data, error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "student_id,date" })
      .select();

    if (error) throw error;
    res.json({ message: "Bulk attendance recorded", count: data.length });
  } catch (err) {
    res.status(500).json({ message: "Bulk attendance failed", error: err.message });
  }
});

// @route   GET /api/admin/attendance?studentId=&from=&to=
// @desc    View attendance report, optionally filtered
router.get("/attendance", async (req, res) => {
  const { studentId, from, to } = req.query;
  let query = supabase
    .from("attendance")
    .select("*, student:student_id(id, name, email, roll_number, department)")
    .order("date", { ascending: false });

  if (studentId) query = query.eq("student_id", studentId);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ message: "Failed to load attendance", error: error.message });
  res.json(data);
});

// @route   GET /api/admin/attendance/export?studentId=&from=&to=
// @desc    Export attendance report as CSV
router.get("/attendance/export", async (req, res) => {
  try {
    const { studentId, from, to } = req.query;
    let query = supabase
      .from("attendance")
      .select("*, student:student_id(name, email, roll_number, department)")
      .order("date", { ascending: false });

    if (studentId) query = query.eq("student_id", studentId);
    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);

    const { data: records, error } = await query;
    if (error) throw error;

    const rows = records.map((r) => ({
      studentName: r.student?.name,
      studentEmail: r.student?.email,
      rollNumber: r.student?.roll_number,
      department: r.student?.department,
      date: r.date,
      status: r.status,
      remarks: r.remarks || "",
    }));

    const parser = new Parser({
      fields: ["studentName", "studentEmail", "rollNumber", "department", "date", "status", "remarks"],
    });
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment(`attendance-report-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: "Export failed", error: err.message });
  }
});

// @route   GET /api/admin/reports/summary
// @desc    Attendance % summary per student (for charts/reports)
router.get("/reports/summary", async (req, res) => {
  try {
    const { data: students, error: studentsError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("role", "student");
    if (studentsError) throw studentsError;

    const { data: records, error: recordsError } = await supabase
      .from("attendance")
      .select("student_id, status");
    if (recordsError) throw recordsError;

    const summary = students
      .map((s) => {
        const own = records.filter((r) => r.student_id === s.id);
        const total = own.length;
        const present = own.filter((r) => r.status === "present").length;
        const absent = own.filter((r) => r.status === "absent").length;
        const late = own.filter((r) => r.status === "late").length;
        return {
          studentId: s.id,
          name: s.name,
          email: s.email,
          total,
          present,
          absent,
          late,
          attendancePercent: total === 0 ? 0 : (present / total) * 100,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: "Failed to build summary", error: err.message });
  }
});

// ---------- Leave management ----------

// @route   GET /api/admin/leaves
router.get("/leaves", async (req, res) => {
  const { data, error } = await supabase
    .from("leaves")
    .select("*, student:student_id(id, name, email, roll_number)")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ message: "Failed to load leaves", error: error.message });
  res.json(data);
});

// @route   PATCH /api/admin/leaves/:id
// body: { status: "approved" | "rejected" }
router.patch("/leaves/:id", async (req, res) => {
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });
  }

  const { data: leave, error } = await supabase
    .from("leaves")
    .update({ status, reviewed_by: req.user.id })
    .eq("id", req.params.id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ message: "Failed to update leave", error: error.message });
  if (!leave) return res.status(404).json({ message: "Leave request not found" });
  res.json(leave);
});

module.exports = router;
