const express = require("express");
const supabase = require("../config/supabase");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All routes below require a logged-in user (student)
router.use(protect);

// @route   GET /api/student/attendance
// @desc    Get the logged-in student's own attendance history
router.get("/attendance", async (req, res) => {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_id", req.user.id)
    .order("date", { ascending: false });

  if (error) return res.status(500).json({ message: "Failed to load attendance", error: error.message });
  res.json(data);
});

// @route   GET /api/student/attendance/summary
// @desc    Get the logged-in student's attendance percentage + breakdown
router.get("/attendance/summary", async (req, res) => {
  const { data: records, error } = await supabase
    .from("attendance")
    .select("status")
    .eq("student_id", req.user.id);

  if (error) return res.status(500).json({ message: "Failed to load summary", error: error.message });

  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.status === "late").length;
  const attendancePercent = total === 0 ? 0 : (present / total) * 100;

  res.json({ total, present, absent, late, attendancePercent });
});

// @route   POST /api/student/leaves
// @desc    Apply for leave
router.post("/leaves", async (req, res) => {
  try {
    const { fromDate, toDate, reason } = req.body;
    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({ message: "fromDate, toDate and reason are required" });
    }

    const { data: leave, error } = await supabase
      .from("leaves")
      .insert({ student_id: req.user.id, from_date: fromDate, to_date: toDate, reason })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ message: "Failed to submit leave request", error: err.message });
  }
});

// @route   GET /api/student/leaves
// @desc    View own leave requests
router.get("/leaves", async (req, res) => {
  const { data, error } = await supabase
    .from("leaves")
    .select("*")
    .eq("student_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ message: "Failed to load leaves", error: error.message });
  res.json(data);
});

module.exports = router;
