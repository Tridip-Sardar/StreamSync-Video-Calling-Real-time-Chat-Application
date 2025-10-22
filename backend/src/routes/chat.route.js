const express = require("express")
const protectRoute = require("../middlewares/auth.middleware")
const getStreamToken = require("../controllers/chat.controller")

const router = express.Router()

router.get("/token", protectRoute, getStreamToken)

module.exports = router