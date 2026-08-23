const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");
const { protect } = require("../middleware/auth");

const router = express.Router();

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// Never send the password hash back to the client
const sanitize = (user) => {
  if (!user) return user;
  const { password, ...rest } = user;
  return rest;
};

// @route   POST /api/auth/register
// @desc    Register a new user (self-signup defaults to "student";
//          creating an "admin" this way should be restricted/removed in production)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, rollNumber, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role === "admin" ? "admin" : "student",
        roll_number: rollNumber || null,
        department: department || null,
      })
      .select()
      .single();

    if (error) throw error;

    const token = generateToken(user.id, user.role);
    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

// @route   POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (!user.is_active) {
      return res.status(403).json({ message: "This account has been deactivated" });
    }

    const token = generateToken(user.id, user.role);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// @route   GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
