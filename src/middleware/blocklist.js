/**
 * Blocklist Middleware
 *
 * Checks if the incoming request's IP is in the blocklist.
 *
 * @module blocklist
 * @author DAASR Team
 * @version 1.0.0
 */

const blocklistManager = require("../services/blocklistManager");

function blocklistMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;

  if (blocklistManager.isBlocked(ip)) {
    // Respond with a 403 Forbidden error if the IP is blocked
    return res.status(403).json({
      error: "Forbidden",
      message: "Your IP address has been blocked.",
    });
  }

  // If the IP is not blocked, proceed to the next middleware
  next();
}

module.exports = blocklistMiddleware;
