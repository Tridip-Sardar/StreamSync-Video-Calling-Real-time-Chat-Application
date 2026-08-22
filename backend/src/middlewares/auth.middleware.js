const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ── In-memory user cache (TTL = 60s) ──
// Eliminates a remote MongoDB round-trip on every authenticated request
// for the same user within the TTL window.
const userCache = new Map();
const USER_CACHE_TTL_MS = 60 * 1000; // 60 seconds

function getCachedUser(userId) {
    const entry = userCache.get(userId);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > USER_CACHE_TTL_MS) {
        userCache.delete(userId);
        return null;
    }
    return entry.user;
}

function setCachedUser(userId, user) {
    userCache.set(userId, { user, timestamp: Date.now() });
}

// Expose for external invalidation if needed (e.g. after profile update)
function invalidateUserCache(userId) {
    userCache.delete(userId);
}

const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized - no token provided" })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
        if (!decoded) {
            return res.status(401).json({ message: "Unauthorized - invalid token" })
        }

        // Check cache first, fall back to DB
        let user = getCachedUser(decoded.userId);
        if (!user) {
            user = await User.findById(decoded.userId).select("-password")
            if (!user) {
                return res.status(401).json({ message: "Unauthorized - no user found" })
            }
            setCachedUser(decoded.userId, user);
        }

        req.user = user

        next()
    } catch (error) {
        console.log("Error in protectRoute middleware", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = { protectRoute, invalidateUserCache }