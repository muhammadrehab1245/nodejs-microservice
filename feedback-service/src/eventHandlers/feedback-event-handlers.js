const logger = require("../utils/logger");
const {
  resolveValidation,
  rejectValidation,
} = require("../utils/like-pending");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const REJECTION_MESSAGES = {
  POST_NOT_FOUND: "Post not found",
  VALIDATION_ERROR: "Validation error",
};

async function handleValidated(event, routingKey) {
  try {
    const { correlationId, postId, userId } = event;

    if (!correlationId) {
      logger.warn(`${routingKey} missing correlationId`, event);
      return;
    }

    logger.info(`${routingKey} validated for post ${postId} by user ${userId}`);
    resolveValidation(correlationId, event);
  } catch (error) {
    logger.error(`Error handling ${routingKey} event`, error);
  }
}

async function handleRejected(event, routingKey) {
  try {
    const { correlationId, reason } = event;

    if (!correlationId) {
      logger.warn(`${routingKey} missing correlationId`, event);
      return;
    }

    logger.warn(`${routingKey} rejected: ${reason}`, event);
    rejectValidation(correlationId, {
      reason: reason,
      message: REJECTION_MESSAGES[reason] || "Request rejected",
    });
  } catch (error) {
    logger.error(`Error handling ${routingKey} event`, error);
  }
}

const handlePostDeleted = async (event) => {
  console.log(event, "eventeventevent");
  const { postId } = event;
  try {

    await Promise.all([
      Like.deleteMany({ postId }),
      Comment.deleteMany({ postId }),
    ]);

    logger.info(`Processed deletion of feedback for post id ${postId}`);
  } catch (e) {
    logger.error(e, "Error occured while feedback deletion");
  }
};

module.exports = { handleValidated, handleRejected, handlePostDeleted };
