
const mongoose = require('mongoose');

const SecondHuntSchema = new mongoose.Schema({
   userId:{
       type: mongoose.Schema.Types.ObjectId,
       ref:'user'
   },
   name:{
       type: String,
       default: "Second Hunt"

   },
   hints:[],

   rewards:[
       
   ],
   flag:{
       type: String,
       default: 'Ongoing'
   },
   startedat:{
       type: Date,
       default: Date.now
   },
   finishedat:{
       type: Date,
       
   },
   timecompleted:{
       type: Number
   },
   rewards:[

   ],






})

exports.SecondHunt = mongoose.model('secondhunt', SecondHuntSchema);
