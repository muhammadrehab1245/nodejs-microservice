const express = require("express");
const {
    getPostDetails,
} = require("../controller/detail-controller");
const { authenticateRequest } = require("../middleware/authMiddleware");

const router = express();

//middleware -> this will tell if the user is an auth user or not
router.use(authenticateRequest);

router.get("/post-details/:postId", getPostDetails);

module.exports = router;
