const Detail = require("../models/Details");
const logger = require("../utils/logger");

const getPostDetails = async (req, res) => {
  logger.info("Get post details endpoint hit");

//   try {
//     const { error } = validateCommentOnPost(req.body);
//     if (error) {
//       logger.warn("Comment validation error", error.details[0].message);
//       return res.status(400).json({
//         success: false,
//         message: error.details[0].message,
//       });
//     }

//     const { postId } = req.params;
//     const { userId } = req.user;
//     const { text } = req.body;

//     const correlationId = crypto.randomUUID();
//     const validationPromise = waitForValidation(correlationId);

//     await publishEvent("feedback.added", {
//       postId,
//       userId,
//       correlationId,
//     });

//     await validationPromise;

//     const comment = await Comment.create({
//       postId,
//       userId,
//       text,
//     });

//     logger.info("Comment created successfully", comment);
//     res.status(201).json({
//       success: true,
//       message: "Comment created successfully",
//       comment,
//     });
//   } catch (error) {
//     handleValidationError(res, error, "comment");
//   }
}; 

module.exports = {
  getPostDetails,
};
