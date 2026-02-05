const { generateStreamToken } = require("../lib/stream")

const getStreamToken = async (req, res) => {
    try {
        const token = await generateStreamToken(req.user.id);

        res.status(200).json({ token });
    } catch (error) {
        console.log("Error in getStreamToken controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = getStreamToken