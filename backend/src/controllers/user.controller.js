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
                { _id: { $nin: currentUser.blockedUsers } }, // Exclude blocked users
                { blockedUsers: { $ne: currentUserId } },    // Exclude users who blocked the current user
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
            .populate("friends", "fullName profilePic nativeLanguage learningLanguage blockedUsers")
        
        // Filter out friends that might have blocked the user, just in case
        const validFriends = user.friends.filter(friend => 
            !friend.blockedUsers?.includes(req.user._id)
        );

        res.status(200).json(validFriends)
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
            return res.status(400).json({ message: "You can't send friend request to yourself" })
        }

        const recipient = await User.findById(recipientId)
        if (!recipient) {
            return res.status(404).json({ message: "Recipient not found" })
        }
        
        // Check for block
        if (req.user.blockedUsers.includes(recipientId) || recipient.blockedUsers?.includes(myId)) {
            return res.status(403).json({ message: "Action not permitted" });
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
        
        // Check for blocks before accepting
        const sender = await User.findById(friendRequest.sender);
        if (req.user.blockedUsers.includes(friendRequest.sender) || sender.blockedUsers?.includes(req.user.id)) {
             return res.status(403).json({ message: "Action not permitted" });
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
        }).populate("sender", "fullName profilePic nativeLanguage learningLanguage blockedUsers")
        
        // Filter out if sender blocked us or we blocked sender
        const filteredIncoming = incomingReqs.filter(reqs => 
            !req.user.blockedUsers.includes(reqs.sender._id) && !reqs.sender.blockedUsers?.includes(req.user._id)
        );

        const acceptedReqs = await FriendRequest.find({
            sender: req.user.id,
            status: "accepted"
        }).populate("recipient", "fullName profilePic blockedUsers")
        
        const filteredAccepted = acceptedReqs.filter(reqs => 
            !req.user.blockedUsers.includes(reqs.recipient._id) && !reqs.recipient.blockedUsers?.includes(req.user._id)
        );

        res.status(200).json({ incomingReqs: filteredIncoming, acceptedReqs: filteredAccepted })
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
        }).populate("recipient", "fullName profilePic nativeLanguage learningLanguage blockedUsers")
        
        const filteredOutgoing = outgoingReqs.filter(reqs => 
            !req.user.blockedUsers.includes(reqs.recipient._id) && !reqs.recipient.blockedUsers?.includes(req.user._id)
        );

        res.status(200).json(filteredOutgoing)
    } catch (error) {
        console.error("Error in getOutgoingFriendRequests controller: ", error.message)
        res.status(500).json({ message: "Internal server error" })
    }
}

const unfriendUser = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: friendId } = req.params;

        await User.findByIdAndUpdate(myId, {
            $pull: { friends: friendId }
        });

        await User.findByIdAndUpdate(friendId, {
            $pull: { friends: myId }
        });

        // Also remove any friend requests
        await FriendRequest.deleteMany({
            $or: [
                { sender: myId, recipient: friendId },
                { sender: friendId, recipient: myId }
            ]
        });

        res.status(200).json({ message: "Unfriended successfully" });
    } catch (error) {
        console.error("Error in unfriendUser controller: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

const blockUser = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: userIdToBlock } = req.params;

        if (myId.toString() === userIdToBlock.toString()) {
            return res.status(400).json({ message: "You cannot block yourself" });
        }

        // Add to block list
        await User.findByIdAndUpdate(myId, {
            $addToSet: { blockedUsers: userIdToBlock }
        });

        // Remove from friends
        await User.findByIdAndUpdate(myId, {
            $pull: { friends: userIdToBlock }
        });
        await User.findByIdAndUpdate(userIdToBlock, {
            $pull: { friends: myId }
        });

        // Also remove any friend requests
        await FriendRequest.deleteMany({
            $or: [
                { sender: myId, recipient: userIdToBlock },
                { sender: userIdToBlock, recipient: myId }
            ]
        });

        res.status(200).json({ message: "User blocked successfully" });
    } catch (error) {
        console.error("Error in blockUser controller: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { 
    getRecommendedUsers, 
    getMyFriends, 
    sendFriendRequest, 
    acceptFriendRequest, 
    getFriendRequests, 
    getOutgoingFriendRequests,
    unfriendUser,
    blockUser
}