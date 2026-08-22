const express = require("express")
const { protectRoute } = require("../middlewares/auth.middleware")
const { getRecommendedUsers, getMyFriends, sendFriendRequest, acceptFriendRequest, getFriendRequests, getOutgoingFriendRequests, unfriendUser, blockUser } = require("../controllers/user.controller")

const router = express.Router()

router.use(protectRoute)

router.get("/", getRecommendedUsers)
router.get("/friends", getMyFriends)
router.post("/friend-request/:id", sendFriendRequest)
router.post("/friend-request/:id/accept", acceptFriendRequest)
router.get("/friend-requests", getFriendRequests)
router.get("/outgoing-friend-requests", getOutgoingFriendRequests)
router.post("/unfriend/:id", unfriendUser)
router.post("/block/:id", blockUser)

module.exports = router