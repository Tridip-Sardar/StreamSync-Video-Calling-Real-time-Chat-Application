const mongoose = require("mongoose")

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URL, {
            maxPoolSize: 50,           // max concurrent connections to Atlas
            minPoolSize: 5,            // keep warm connections ready
            socketTimeoutMS: 30000,    // close idle sockets after 30s
            serverSelectionTimeoutMS: 5000, // fail fast on connectivity issues
        })
        console.log(`MONGODB connected: ${conn.connection.host} (pool: 5–50)`)
    } catch (error) {
        console.log(`Error in connecting to MONGODB: ${error}`)
        process.exit(1)
    }
}

module.exports = connectDB