const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Utilisateur non authentifié.' });
    }

    const hasRole = roles.includes(req.user.role);
    if (!hasRole) {
      return res.status(403).json({ error: 'Accès interdit. Permission insuffisante.' });
    }

    next();
  };
};

module.exports = roleMiddleware;
