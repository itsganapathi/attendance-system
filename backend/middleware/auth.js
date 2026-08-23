const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

// Verifies the JWT and attaches the user (from Supabase/Postgres) to req.user
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role, roll_number, department, is_active")
      .eq("id", decoded.id)
      .single();

    if (error || !user || !user.is_active) {
      return res.status(401).json({ message: "Not authorized, user not found or inactive" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, invalid or expired token" });
  }
};

// Restricts access to admin-only routes
const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Access denied: admin role required" });
  }
  next();
};

module.exports = { protect, isAdmin };
