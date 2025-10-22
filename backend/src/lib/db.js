const mongoose = require("mongoose")

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URL)
        console.log(`MONGODB connected: ${conn.connection.host}`)
    } catch (error) {
        console.log(`Error in connecting to MONGODB: ${error}`)
        process.exit(1)
    }
}

module.exports = connectDB