const Detail = require("../models/Details");
const logger = require("../utils/logger");

const getPostDetails = async (req, res) => {
  logger.info("Get post details endpoint hit");

  try {
    const { postId } = req.params;
    const { userId } = req.user;
    const cacheKey = `post-details:${postId}`;

    const cached = await req.redisClient.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      parsed.feedback.likedByCurrentUser = parsed._likes?.includes(userId) ?? false;
      delete parsed._likes;
      return res.status(200).json(parsed);
    }

    const detail = await Detail.findOne({ postId });

    if (!detail) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const likeCount = detail.likes.length;
    const commentCount = detail.comments.length;
    const likedByCurrentUser = detail.likes.includes(userId);

    const comments = [...detail.comments]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(({ commentId, userId: commentUserId, text, createdAt }) => ({
        commentId,
        userId: commentUserId,
        text,
        createdAt,
      }));

    const response = {
      success: true,
      post: {
        id: detail.postId,
        content: detail.content,
        mediaIds: detail.mediaIds,
        createdAt: detail.postCreatedAt,
        userId: detail.userId,
      },
      author: {
        userId: detail.userId,
      },
      feedback: {
        likeCount,
        commentCount,
        likedByCurrentUser,
      },
      comments: {
        items: comments,
        total: commentCount,
      },
    };

    await req.redisClient.setex(
      cacheKey,
      300,
      JSON.stringify({ ...response, _likes: detail.likes }),
    );

    res.status(200).json(response);
  } catch (error) {
    logger.error("Error fetching post details", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  getPostDetails,
};
