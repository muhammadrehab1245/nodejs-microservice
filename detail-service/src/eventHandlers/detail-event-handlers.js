const Detail = require("../models/Details");
const logger = require("../utils/logger");

async function handlePostCreated(event) {
  try {
    const newDetailPost = new Detail({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      postCreatedAt: event.createdAt,
      mediaIds: event.mediaIds || [],
      comments: [],
      likes: [],
    });
    await newDetailPost.save();
    logger.info(
      `Detail post created: ${event.postId}, ${newDetailPost._id.toString()}`,
    );
  } catch (error) {
    logger.error(error, "Error handling post creation event");
  }
}

async function handlePostDeleted(event) {
  try {
    await Detail.findOneAndDelete({
      postId: event.postId,
      userId: event.userId,
    });
    logger.info(`Detail post deleted: ${event.postId}`);
  } catch (error) {
    logger.error(error, "Error handling post deletion event");
  }
}

async function handleFeedbackAdded(event) {
  try {
    if (event.FeedbackType === "COMMENT") {
      await Detail.findOneAndUpdate(
        { postId: event.postId },
        {
          $push: {
            comments: {
              commentId: event.commentId,
              text: event.text,
              createdAt: event.createdAt,
              userId: event.userId,
            },
          },
        },
      );
    } else if (event.FeedbackType === "LIKE") {
      await Detail.findOneAndUpdate(
        { postId: event.postId },
        { $addToSet: { likes: event.userId } },
      );
    }
    logger.info(`Detail feedback added: ${event.postId}`);
  } catch (error) {
    logger.error(error, "Error handling feedback addition event");
  }
}

async function handleFeedbackRemoved(event) {
  try {
    if (event.FeedbackType === "COMMENT") {
      await Detail.findOneAndUpdate(
        { postId: event.postId },
        { $pull: { comments: { commentId: event.commentId } } },
      );
    } else if (event.FeedbackType === "LIKE") {
      await Detail.findOneAndUpdate(
        { postId: event.postId },
        { $pull: { likes: event.userId } },
      );
    }
    logger.info(`Detail feedback removed: ${event.postId}`);
  } catch (error) {
    logger.error(error, "Error handling feedback removal event");
  }
}

module.exports = {
  handlePostCreated,
  handlePostDeleted,
  handleFeedbackAdded,
  handleFeedbackRemoved,
};
