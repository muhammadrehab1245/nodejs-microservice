const express = require("express");
const {
    createLike,
    createComment,
    deleteComment,
    deleteLike,
    getPostComments,
    getPostLikes,
} = require("../controller/feedback-controller");
const { authenticateRequest } = require("../middleware/authMiddleware");

const router = express();

//middleware -> this will tell if the user is an auth user or not
router.use(authenticateRequest);

router.get("/posts/:postId/comments", getPostComments);
router.post("/posts/:postId/comments", createComment);
router.delete("/comments/:commentId", deleteComment);
router.get("/posts/:postId/likes", getPostLikes);
router.get("/posts/:postId/like", createLike);
router.delete("/posts/:postId/like", deleteLike);
// router.get("/:id", getPost);
// router.delete("/:id", deletePost);

module.exports = router;
