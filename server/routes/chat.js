const express = require("express");
const { chat, clearSession } = require("../controllers/chatController");

const router = express.Router();

// POST /api/chat
router.post("/", chat);

// DELETE /api/chat/session/:sessionId
router.delete("/session/:sessionId", clearSession);

module.exports = router;
