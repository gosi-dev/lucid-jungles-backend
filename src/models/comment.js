const mongoose = require('mongoose');

// Comment — comment on a feed post (DATA_MODEL.md: Comment)
const commentSchema = new mongoose.Schema({
  postId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
}, { timestamps: true });

commentSchema.index({ postId: 1, createdAt: 1 });

exports.Comment = mongoose.model('Comment', commentSchema);
