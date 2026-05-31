const Post = require("../models/Post");
const logger = require("../utils/logger");
const { publishEvent } = require("../utils/rabbitmq");

async function handleFeedbackCreated(event) {
  try {
    const { postId, userId, correlationId } = event;

    if (!postId || !userId || !correlationId) {
      logger.warn("feedback.added missing postId, userId, or correlationId", event);
      return;
    }

    const post = await Post.findById(postId);

    if (!post) {
      logger.warn(`Like rejected — post not found: ${postId}`);
      await publishEvent("feedback.rejected", {
        postId,
        userId,
        correlationId,
        reason: "POST_NOT_FOUND",
      });
      return;
    }

    logger.info(`Like validated for post ${postId} by user ${userId}`);
    await publishEvent("feedback.validated", {
      postId,
      userId,
      correlationId,
    });
  } catch (error) {
    logger.error(error, "Error handling feedback.added event");

    if (event?.correlationId) {
      await publishEvent("feedback.rejected", {
        postId: event.postId,
        userId: event.userId,
        correlationId: event.correlationId,
        reason: "VALIDATION_ERROR",
      });
    }
  }
}

async function handleFeedbackRemoved(event) {
  try {
    const { postId, userId, correlationId } = event;

    if (!postId || !userId || !correlationId) {
      logger.warn("feedback.removed missing postId, userId, or correlationId", event);
      return;
    }

    const post = await Post.findById(postId);

    if (!post) {
      logger.warn(`Like removed rejected — post not found: ${postId}`);
      await publishEvent("feedback.rejected", {
        postId,
        userId,
        correlationId,
        reason: "POST_NOT_FOUND",
      });
      return;
    }

    logger.info(`Like removed validated for post ${postId} by user ${userId}`);
    await publishEvent("feedback.validated", {
      postId,
      userId,
      correlationId,
    });
  } catch (error) {
    logger.error(error, "Error handling feedback.removed event");

    if (event?.correlationId) {
      await publishEvent("feedback.rejected", {
        postId: event.postId,
        userId: event.userId,
        correlationId: event.correlationId,
        reason: "VALIDATION_ERROR",
      });
    }
  }
}

module.exports = { handleFeedbackCreated, handleFeedbackRemoved };
