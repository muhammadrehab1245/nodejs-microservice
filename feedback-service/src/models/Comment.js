const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500,
    },
  },
  { timestamps: true },
);

commentSchema.index({ postId: 1, createdAt: -1 });

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;