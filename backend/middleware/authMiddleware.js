import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  try {
    let token = null;

    // 1. From cookie
    if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // 2. From Authorization header
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      role: decoded.role || null
    };

    next();

  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};