const User = require("../models/User")
const FriendRequest = require("../models/FriendRequest")

const getRecommendedUsers = async (req, res) => {
    try {
        const currentUserId = req.user._id
        const currentUser = req.user

        const recommendedUsers = await User.find({
            $and: [
                { _id: { $ne: currentUserId } },
                { _id: { $nin: currentUser.friends } },
                { isOnboarded: true }
            ]
        })
        res.status(200).json(recommendedUsers)
    } catch (error) {
        console.error("Error in getRecommendedUsers controller: ", error.message)
        res.status(500).json({ message: "Internal server error" })
    }
}

const getMyFriends = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select("friends")
            .populate("friends", "fullName profilePic nativeLanguage learningLanguage")

        res.status(200).json(user.friends)
    } catch (error) {
        console.error("Error in getMyFriends controller: ", error.message)
        res.status(500).json({ message: "Internal server error" })
    }
}

const sendFriendRequest = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: recipientId } = req.params;

        if (myId == recipientId) {
            return res.status(400).json({ message: "You can't send friend request to youorself" })
        }

        const recipient = await User.findById(recipientId)
        if (!recipient) {
            return res.json(404).json({ message: "Recipient not found" })
        }

        if (recipient.friends.includes(myId)) {
            return res.status(400).json({ message: "You are already friends with this user" })
        }

        const existingRequest = await FriendRequest.findOne({
            $or: [
                { sender: myId, recipient: recipientId },
                { sender: recipientId, recipient: myId },
            ]
        })
        if (existingRequest) {
            return res.status(400).json({ message: "A friend request already exists between you and this user" })
        }

        const friendRequest = new FriendRequest({
            sender: myId,
            recipient: recipientId
        });

        await friendRequest.save()

        res.status(201).json(friendRequest)

    } catch (error) {
        console.error("Error in sendFriendRequest controller: ", error.message)
        res.status(500).json({ message: "Internal server error" })
    }
}

const acceptFriendRequest = async (req, res) => {
    try {
        const { id: requestId } = req.params;

        const friendRequest = await FriendRequest.findById(requestId);
        if (!friendRequest) {
            return res.status(404).json({ message: "Friend request not found" });
        }

        if (friendRequest.recipient.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }

        friendRequest.status = "accepted";
        await friendRequest.save();

        await User.findByIdAndUpdate(friendRequest.sender, {
            $addToSet: { friends: friendRequest.recipient },
        });

        await User.findByIdAndUpdate(friendRequest.recipient, {
            $addToSet: { friends: friendRequest.sender },
        });

        res.status(200).json({ message: "Friend request accepted" });
    } catch (error) {
        console.error("Error in acceptFriendRequest:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getFriendRequests = async (req, res) => {
    try {
        const incomingReqs = await FriendRequest.find({
            recipient: req.user.id,
            status: "pending"
        }).populate("sender", "fullName profilePic nativeLanguage learningLanguage")

        const acceptedReqs = await FriendRequest.find({
            sender: req.user.id,
            status: "accepted"
        }).populate("recipient", "fullName profilePic")

        res.status(200).json({ incomingReqs, acceptedReqs })
    } catch (error) {
        console.error("Error in getFriendRequests controller: ", error.message)
        res.status(500).json({ message: "Internal server error" })
    }
}

const getOutgoingFriendRequests = async (req, res) => {
    try {
        const outgoingReqs = await FriendRequest.find({
            sender: req.user.id,
            status: "pending"
        }).populate("recipient", "fullName profilePic nativeLanguage learningLanguage")

        res.status(200).json(outgoingReqs)
    } catch (error) {
        console.error("Error in getOutgoingFriendRequests controller: ", error.message)
        res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = { getRecommendedUsers, getMyFriends, sendFriendRequest, acceptFriendRequest, getFriendRequests, getOutgoingFriendRequests }