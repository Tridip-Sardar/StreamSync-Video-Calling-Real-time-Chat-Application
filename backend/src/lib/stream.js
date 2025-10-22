const { StreamChat } = require("stream-chat");
const dotenv = require("dotenv")

dotenv.config()

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_SECRET_KEY;

if (!apiKey || !apiSecret) {
    console.error("Stream api key or secret is missing");
}

const streamClient = StreamChat.getInstance(apiKey, apiSecret);

const upsertStreamUser = async (userData) => {
    try {
        await streamClient.upsertUsers([userData]);
        return userData;
    } catch (error) {
        console.error("Error upserting Stream user: ", error)
    }
}

const generateStreamToken = async (userId) => {
    try {
        const userIdstr = userId.toString();
        return streamClient.createToken(userIdstr);
    } catch (error) {
        console.error("Error in generateStreamToken: ", error.message);
    }
}

module.exports = { upsertStreamUser, generateStreamToken}