const express = require("express");
const router = express.Router();
const Leader = require("../Model/Votemodel");

// Static leader names (ensure they match exactly)
const LEADER_NAMES = ["chandan", "sandeep", "lalit", "manish"];

// Helper to get user's IP
const getUserIp = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
};

// POST /vote - Vote for a leader
router.post("/vote", async (req, res) => {
    try {
        const { candidate } = req.body;
        const userIp = getUserIp(req);

        const matchedLeader = LEADER_NAMES.find(
            (name) => name.toLowerCase() === candidate.toLowerCase()
        );

        if (!matchedLeader) {
            return res.status(400).json({ message: `Leader '${candidate}' not found` });
        }

        let leader = await Leader.findOne({ name: new RegExp(`^${matchedLeader}$`, "i") });

        if (!leader) {
            // If the leader doesn't exist, create it with 1 vote and store IP
            leader = new Leader({
                name: matchedLeader,
                votes: 1,
                votedUsers: [userIp]
            });
        } else {
            // Check if the user has already voted
            if (leader.votedUsers.includes(userIp)) {
                return res.status(403).json({ message: "You have already voted for this leader." });
            }

            // Add vote and user IP
            leader.votes += 1;
            leader.votedUsers.push(userIp);
        }

        await leader.save();

        res.status(200).json({ message: `Vote cast successfully for ${matchedLeader}!`, leader });
    } catch (err) {
        res.status(500).json({ error: "Failed to vote", details: err.message });
    }
});

// GET /leaders - Get all leaders and vote counts
router.get("/leaders", async (req, res) => {
    try {
        const leaders = await Leader.find({}, { name: 1, votes: 1, _id: 0 });
        res.status(200).json(leaders);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch leaders", details: err.message });
    }
});

module.exports = router;
