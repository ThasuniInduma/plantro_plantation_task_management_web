export const authorize = (...allowedRoles) => {
  const normalizedRoles = allowedRoles.map(r => r.toLowerCase());

  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role_name) {
        return res.status(403).json({ message: "No role found" });
      }

      if (!normalizedRoles.includes(req.user.role_name)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
};