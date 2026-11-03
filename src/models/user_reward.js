
const mongoose = require('mongoose');

const user_rewardSchema = new mongoose.Schema({
   userId:{
       type: mongoose.Schema.Types.ObjectId,
       ref:'user'
   },
   clues:[

   ],
   rewards:[
       
   ]

})



exports.Reward = mongoose.model('user_reward', user_rewardSchema);