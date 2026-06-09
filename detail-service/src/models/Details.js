const mongoose = require("mongoose");

const detailsSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    mediaIds: [
      {
        type: String,
      },
    ],
    postCreatedAt: {
      type: Date,
      required: true,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: String,
      },
    ],
    comments: [
      {
        commentId: {
          type: String,
          required: true,
        },
        userId: {
          type: String,
          required: true,
        },
        text: {
          type: String,
          required: true,
          trim: true,
          maxlength: 500,
        },
        createdAt: {
          type: Date,
          required: true,
        },
      },
    ],
  },
  { timestamps: true },
);

detailsSchema.index({ postId: 1, postCreatedAt: -1 });

const Details = mongoose.model("Details", detailsSchema);

module.exports = Details;
