import jwt from "jsonwebtoken";

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role_name) {
        return res.status(403).json({ message: "No role found" });
      }

      const userRole = req.user.role_name.toLowerCase();

      if (!allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
};