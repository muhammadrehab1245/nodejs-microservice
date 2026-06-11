async function handlePostCreated(event) {
    try {
        const newDetailPost = new Detail({
            postId: event.postId,
            userId: event.userId,
            content: event.content,
            postCreatedAt: event.createdAt,
            mediaIds: event.mediaIds,
            comments: [],
            likes: [],
            likesCount: 0,
        });
        await newDetailPost.save();
        logger.info(`Detail post created: ${event.postId}, ${newDetailPost._id.toString()}`);
    } catch (error) {
        logger.error(error, "Error handling post creation event");
    }
}

async function handlePostDeleted(event) {
    try {
        await Detail.findOneAndDelete({ postId: event.postId,userId: event.userId });
        logger.info(`Detail post deleted: ${event.postId}`);
    } catch (error) {
        logger.error(error, "Error handling post deletion event");
    }
}

module.exports = { handlePostCreated, handlePostDeleted };