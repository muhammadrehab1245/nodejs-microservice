const crypto = require("crypto");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const logger = require("../utils/logger");
const { publishEvent } = require("../utils/rabbitmq");
const { waitForValidation } = require("../utils/like-pending");
const { validateCommentOnPost } = require("../utils/validation");
const { invalidatePostFeedbackCache } = require("../utils/cache");

function handleValidationError(res, error, action) {
  if (error.reason === "POST_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }

  if (error.reason === "VALIDATION_TIMEOUT") {
    return res.status(504).json({
      success: false,
      message: error.message,
    });
  }

  if (error.reason === "LIKE_REJECTED") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.reason === "VALIDATION_ERROR") {
    return res.status(500).json({
      success: false,
      message: `Failed to validate ${action}`,
    });
  }

  logger.error(`Error during ${action}`, error);
  return res.status(500).json({
    success: false,
    message: error.message || "Internal server error",
  });
}

const createLike = async (req, res) => {
  logger.info("Create like endpoint hit");

  try {
    const { postId } = req.params;
    const { userId } = req.user;
    console.log("userId::", userId);
    const existingLike = await Like.findOne({ postId, userId });
    if (existingLike) {
      return res.status(409).json({
        success: false,
        message: "Post already liked",
      });
    }

    const correlationId = crypto.randomUUID();
    const validationPromise = waitForValidation(correlationId);

    await publishEvent("feedback.added", {
      postId,
      userId,
      correlationId,
    });

    await validationPromise;

    const newLike = new Like({
      postId,
      userId,
    });
    await newLike.save();

    await publishEvent("detail.feedback.added", {
      FeedbackType: "LIKE",
      postId,
      userId,
      likeId: newLike._id.toString(),
      createdAt: newLike.createdAt,
    });

    await invalidatePostFeedbackCache(req.redisClient, postId);

    logger.info("Liked successfully", newLike);
    res.status(201).json({
      success: true,
      message: "Liked successfully",
      liked: true,
    });
  } catch (error) {
    handleValidationError(res, error, "like");
  }
};

const createComment = async (req, res) => {
  logger.info("Create comment endpoint hit");

  try {
    const { error } = validateCommentOnPost(req.body);
    if (error) {
      logger.warn("Comment validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { postId } = req.params;
    const { userId } = req.user;
    const { text } = req.body;

    const correlationId = crypto.randomUUID();
    const validationPromise = waitForValidation(correlationId);

    await publishEvent("feedback.added", {
      postId,
      userId,
      correlationId,
    });

    await validationPromise;

    const comment = await Comment.create({
      postId,
      userId,
      text,
    });

    await publishEvent("detail.feedback.added", {
      FeedbackType: "COMMENT",
      postId,
      userId,
      commentId: comment._id.toString(),
      text: comment.text,
      createdAt: comment.createdAt,
    });

    await invalidatePostFeedbackCache(req.redisClient, postId);

    logger.info("Comment created successfully", comment);
    
    res.status(201).json({
      success: true,
      message: "Comment created successfully",
      comment,
    });
  } catch (error) {
    handleValidationError(res, error, "comment");
  }
};

const getPostComments = async (req, res) => {
  logger.info("Get post comments endpoint hit");

  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const cacheKey = `comments:${postId}:${page}:${limit}`;

    const cached = await req.redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const [comments, total] = await Promise.all([
      Comment.find({ postId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments({ postId }),
    ]);

    const result = { comments, total, page };

    await req.redisClient.setex(cacheKey, 180, JSON.stringify(result));

    res.status(200).json(result);
  } catch (error) {
    logger.error("Error fetching post comments", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const getPostLikes = async (req, res) => {
  logger.info("Get post likes endpoint hit");

  try {
    const { postId } = req.params;
    const { userId } = req.user;
    const cacheKey = `likes:${postId}:${userId}`;

    const cached = await req.redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const [count, userLike] = await Promise.all([
      Like.countDocuments({ postId }),
      Like.findOne({ postId, userId }).select("_id"),
    ]);

    const result = {
      count,
      likedByCurrentUser: Boolean(userLike),
    };

    await req.redisClient.setex(cacheKey, 180, JSON.stringify(result));

    res.status(200).json(result);
  } catch (error) {
    logger.error("Error fetching post likes", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const deleteComment = async (req, res) => {
  logger.info("Delete comment endpoint hit");

  try {
    const { commentId } = req.params;
    const { userId } = req.user;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the comment owner can delete this comment",
      });
    }

    const { postId } = comment;
    const correlationId = crypto.randomUUID();
    const validationPromise = waitForValidation(correlationId);

    await publishEvent("feedback.removed", {
      postId,
      userId,
      correlationId,
    });

    await validationPromise;

    await Comment.findByIdAndDelete(commentId);

    await publishEvent("detail.feedback.removed", {
      FeedbackType: "COMMENT",
      postId,
      userId,
      commentId,
      text: comment.text,
      createdAt: comment.createdAt,
    });

    await invalidatePostFeedbackCache(req.redisClient, postId);

    logger.info(`Comment ${commentId} removed by user ${userId}`);
    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    handleValidationError(res, error, "comment deletion");
  }
};

const deleteLike = async (req, res) => {
  logger.info("Delete like endpoint hit");

  try {
    const { postId } = req.params;
    const { userId } = req.user;

    const existingLike = await Like.findOne({ postId, userId });
    if (!existingLike) {
      return res.status(404).json({
        success: false,
        message: "Like not found",
      });
    }

    const correlationId = crypto.randomUUID();
    const validationPromise = waitForValidation(correlationId);

    await publishEvent("feedback.removed", {
      postId,
      userId,
      correlationId,
    });

    await validationPromise;

    await Like.findOneAndDelete({ postId, userId });

    await publishEvent("detail.feedback.removed", {
      FeedbackType: "LIKE",
      postId,
      userId,
      likeId: existingLike._id.toString(),
      createdAt: existingLike.createdAt,
    });

    await invalidatePostFeedbackCache(req.redisClient, postId);

    logger.info(`Like removed for post ${postId} by user ${userId}`);
    res.status(200).json({
      success: true,
      message: "Like removed successfully",
      liked: false,
    });
  } catch (error) {
    handleValidationError(res, error, "unlike");
  }
};

module.exports = {
  createLike,
  createComment,
  deleteComment,
  deleteLike,
  getPostComments,
  getPostLikes,
};
