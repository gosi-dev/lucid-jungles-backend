
const mongoose = require('mongoose');

const LeaderboardSchema = new mongoose.Schema({
   userId:{
       type: mongoose.Schema.Types.ObjectId,
       ref:'user'
   },
   
   

   
   
   startedat:{
       type: Date,
       default: Date.now
   },
   finishedat:{
       type: Date,
       
   },
 






})

exports.Board = mongoose.model('leaderboard', LeaderboardSchema);
