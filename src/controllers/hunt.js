
const { Clues } = require('../models/clues')
const{ Reward }= require('../models/user_reward')
const { Mask } = require('../models/mask')
const { SecondHunt } = require('../models/secondhunt')
const userRepository = require('../repositories/user')
const { User } = require('../models/user')
const { Board } = require('../models/leaderboard')
const { Keyboard } = require('../models/keyboard')
exports.getClues =async (req,res)=>{
  

    const clues = await Clues.findOne({name:'Hunt'})
    
   
    
    return res.status(200).json({status:true,'message':'Retrieved Successfully', data:{clues: clues.clues}})
}
exports.getuser_reward =  async(req,res)=>{

  const {userId} = req.body
  const user = await Reward.findOne({userId:userId})
  const find = await User.findOne({_id:userId})
   

  if(user){
    return res.status(200).json({status:true,'message':'User retrieved successfully',data:{
      clues: user.clues,
      rewards: user.rewards,
      idiokToken: find.idiokToken
    }})

  }
  return res.status(200).json({status:true, 'message':'Retrieved Successfully', data:{clues:[], rewards:[],idiokToken:find.idiokToken}})
}
exports.postHunt = async(req,res)=>{
    const {userId, clue} = req.body
  
    const existing_user = await Reward.findOne({userId:userId})
    //Check if the user has gotten a clue already
    if(existing_user && !(existing_user.clues.length >= 4) && !existing_user.clues.includes(clue)){
      await existing_user.clues.push(clue)
      
      if (existing_user.clues.length == 4){
        const mask = await Mask.findOne({name:'Hunt'})
       
        
       await existing_user.rewards.push(mask.rewards[0])
       await existing_user.save()
       await userRepository.updateHuntToken(userId,20)
       return res.status(200).json({status:true, 'message': 'Congratulations, you completed all the clues and you have gotten a Paperbag mask and 10 idiokToken', data:{rewards:existing_user.rewards}})
        
      
  
      
      
      
      }
      await existing_user.save()
    
      
      return res.status(200).json({status:true,'message':'You got one Clue correctly' })
  
    }
    
  
  
    if(existing_user && existing_user.clues.includes(clue) ){
      
      return res.status(400).json({status:false,'message':'You have gotten this Clue already'})
    }
    
    
    if(!existing_user){
    const new_user =await new Reward({
      userId: userId
    })
    await new_user.clues.push(clue)
    await new_user.save()
    return res.status(200).json({status:true, 'message': 'You got one clue correctly'})
  
    }
  }


exports.keyboardverification =  async(req,res)=>{

  const {key, userId} = req.body
  try{
  const verify = await Keyboard.findOne({name:'Second Hunt'})

  if (key === verify.secret){

    await userRepository.updateHuntToken(userId,20)
    return res.status(200).json({status:true, 'message':'Puzzle completed Successfully'})



    
  } 
  return res.status(400).json({status:false, 'message':'Incorrect Input'})
  }
  catch{
    res.status(502).json({status:true,'message': 'Network error', data:{}})
  }

}


exports.startsecondhunt = async (req,res)=>{

  const {userid} =  req.body

  
  try{
  const existing = await SecondHunt.findOne({userId: userid})
  if(existing){
    return res.status(401).json({'status': false, 'message': 'You have Started the Second Hunt already'})
  }
  if(!existing){
  const newuser = await new SecondHunt({userId: userid, })
  
  await newuser.save()
  const board  = await new Board({userId: userid})
  await board.save()

  return res.status(200).json({'status': true, 'message': 'Initiated Second Hunt'})
  }
  }
  catch{

    return res.status(502).json({'status': true, 'message': 'Network error'})

  }







}

exports.getHint = async (req,res) =>{
  const {userid} = req.body
  var  Hint= ['Look closely at your puzzle tiles for hidden glyphs(symbols)', 'Match the hidden glyphs(symbols) in your tiles with these fragments you found.', 'Look out for the first glyph(synmbol) in each puzzle piece',]
  let idiokstand = 5
  const multiple = 2
  let initial
  
  try{
    const user = await SecondHunt.findOne({userId: userid})
    
    
    if(user && user.hints.length === 0 ){
      
      await user.hints.push(Hint[0])
      await user.save()
      //const  updated_data = await SecondHunt.findOne({userId:userid})
      
      return res.status(200).json({status:true, 'message': 'You have requested one hint Successfully' ,data:Hint[0]})

      

    }
    if(user && user.hints.length === 3){
      return res.status(200).json({status: true, 'message': 'You have unlocked all hints',})
    }
    if(user  && user.hints.length > 0 && user.hints.length < 3 ){
      
      //const check = Object.keys(user.hints).pop()
      var hunt1details = await User.findById(userid)
      if(hunt1details.idiokToken >= idiokstand){
       initial = user.hints.length 
        user.hints.push(Hint[initial])
        await user.save()
        
        await userRepository.updateHuntToken(userid,-5)
        /*
        if(user.hints.length === 3){
          return res.status(200).json({status: true, 'message': 'You have used all hints', data: {hint: Hint[initial], }})
        }
        */
        
        return res.status(200).json({status:true, 'message': `You have requested one hint successfully`  ,data: Hint[initial] })

      }
      
      if (hunt1details.idiokToken < idiokstand){
        
        return res.status(401).json({status:false, 'message': 'You do not have enough idiokTokens' })
      }
     
      
      
    }
 
    
 
  if(!user){
    return res.status(404).json({staus:false,'message':'Invalid User'})
  }
}
catch{
  return res.status(502).json({staus:false,'message':'Network error'})
}
  
  
}
 

exports.endhunt = async(req,res) =>{

  const {userid, keys} = req.body
  
  const huntids = [1,2,3,4]
  const codes = []
  let usertime
// try{
  const user = await User.findById(userid)

  if(user){
  for (let i = 0; i< huntids.length; i++){
    const check = await Keyboard.findOne({id:huntids[i]})
    codes.push(check.code)

  }
  const already_completed= await SecondHunt.findOne({userId:userid})
  if (JSON.stringify(codes) === JSON.stringify(keys) && already_completed.flag === 'Ongoing'){
    await  SecondHunt.findOneAndUpdate({userId:userid},{flag:'Completed',finishedat:Date.now()})
    
   await Board.findOneAndUpdate({userId:userid},{finishedat: Date.now()})
    await Board.aggregate([
    
      
      {
        $group:
           {
             _id:"$userId",  
               averageTime:
                  {
                     $avg:
                        {
                           $dateDiff:
                              {
                                  startDate: "$startedat",
                                  endDate: "$finishedat",
                                  unit: "second"
                              }
                         }
                  }
           }
     },
      
      
     
    
    ]).then(result=>{
      
     
     
      
      //console.log(result[1])
      for (let i = 0; i < result.length; i++){
        if(result[i]['_id'].toString() === userid){
          usertime = result[i]['averageTime']
          
          
        }
      }
      
    }).catch(err=>{
      console.log(err)
    })
    let totalSeconds = usertime
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    minutes = String(minutes).padStart(2, "0");
    hours = String(hours).padStart(2, "0");
    seconds = String(seconds).padStart(2, "0");
  //convert to hh:mm:ss
   const result = hours + ":" + minutes + ":" + seconds
    await userRepository.updateHuntToken(userid, 10)
   
  
    return res.status(200).json({status: true, 'message': 'You have completed the second Hunt Successfully',timestamp:result})

  
  
  }
  if (already_completed.flag === 'Completed'){
    return res.status(401).json({status: false, 'message': 'You have completed the hunt already'})

  }
  if(!JSON.stringify(codes) === JSON.stringify(keys)  ){

  return res.status(401).json({status: false, 'message': 'The keyboard input is incorrect'})
  }
 
  }
  if(!user){
    return res.status(401).json({status: false, 'message': 'Invalid User'})

  }
 
//}

// catch{
   // return res.status(502).json({status: false, 'message': 'Network error'})

 // }

}


exports.leaderboard = async(req,res)=>{
  const {userid} = req.body
  const current_user = await User.findById(userid)
  

  function convert_to_timestamp (to_convert){
    const result = new Date(to_convert * 1000).toISOString().slice(11, 19)
    let totalSeconds = to_convert
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
  
   minutes = String(minutes).padStart(2, "0");
   hours = String(hours).padStart(2, "0");
   seconds = String(seconds).padStart(2, "0");

   return [minutes,hours,seconds]
  }
 const checkuserexists = await User.findById(current_user)



 

  Board.aggregate([   
    {
      $group:
         {
           _id:"$userId",  
             averageTime:
                {
                   $avg:
                      {
                         $dateDiff:
                            {
                                startDate: "$startedat",
                                endDate: "$finishedat",
                                unit: "second"
                            }
                       }
                }
         }
   },
  ]).then(result=>{
  
    const leader = result
    
    
    //Holds the sorted objectedids in string format
    const array = []
    //An Object that holds the username,timestamp, lucidmoji_link and the ranks of the sorted user
    const board = {}
    const new_board = {}
    //Holds the time in seconds of the sorted user
    const time = []
    //holds the time in the formatted format
    const to_formatted = []
    const lucidmoj = []
 
  
  //Sort the objectid
  for (let i =0; i < leader.length; i++){
    let keys = leader[i]['_id']
    let value = leader[i]['averageTime']
    if (value != null){
      new_board[keys] = value

    }
    
   

  }
    
    const sortable = Object.fromEntries(
    Object.entries(new_board).sort(([,a],[,b]) => a-b)
);
  
  for (const key in sortable){
    array.push(key)
    time.push(sortable[key])

  }

  
  
  for (let i= 0; i < time.length; i++){

    
    const conv = convert_to_timestamp(time[i])
  
   to_formatted.push(conv[1] + ":" + conv[0] + ":" + conv[2])

  }

  

  //Create an array of  board
  let profile_picture = null
    async function searching(search){
    for (let i = 0; i < 20; i++) {
      if (i === (search.length))break
       

      
      const user =await User.findById(search[i])
      
      if (user && user.profile_picture &&user.profile_picture != null){
        profile_picture = user.profile_picture
      }
      
      
      
      if (user){
      board[i+1] = {username:user.username, timestamp: to_formatted[i],lucidmoji:profile_picture}
      }
    
    
  }
  
  

  
  if (checkuserexists){
  checklist = []
  const checkboard = await Board.findOne({userId: current_user})
  

  //console.log(checkboard.finishedat)
  
  for (let i=0; i < (Object.values(board)).length; i++){
    checklist.push(Object.values(board)[i]['username'])
  }
    
     
    if (!checklist.includes(current_user.username) && checkboard && checkboard.finishedat != undefined){
      const find = new_board[userid]
      const time = convert_to_timestamp(find)
      board[21] = {username: current_user.username,timestamp: time[1] + ":" + time[0] + ":" + time[2], lucidmoji: current_user.profile_picture }
    }
  }
  
 
  
 
 
  
  return res.status(200).json({status: true, 'message': 'Leaderboard Retrieved Successfully', data: {Week_Number: 1,Hunt_number :2, board, }})
    
  
   
  }
  
  searching(array)
  
 



  
})
 
.catch(err=>{
      return res.status(502).json({status: false, 'message': 'Network error'})
})
}




exports.gethuntstatus = async(req,res) =>{
  const {userid} = req.body
  let hunt1 = 'Not Started'
  let hunt2 =  'Not Started'
  let Currenthunt = 1
  const hunt1details = await Reward.findOne({userId: userid})
  const hunt2details = await SecondHunt.findOne({userId:userid})
  if (hunt1details && hunt1details.rewards.includes('Paperbag Mask')){
    hunt1 = 'Completed'
  }
  if (hunt1details && hunt1details.rewards.length === 0 ){
    hunt1 = 'Ongoing'
    Currenthunt = 1
  }
  if (hunt1details && hunt1details.rewards.length === 1 ){
    hunt1 = 'Completed'
    Currenthunt = 1
  }
  if (hunt2details && hunt2details.flag === 'Ongoing'){
    hunt2 ='Ongoing'
    Currenthunt = 2

  }
  if (hunt2details && hunt2details.flag === 'Completed'){
    hunt2 = 'Completed'
    Currenthunt = 2
  }
  

  return res.status(200).json({status: true, data:{Currenthunt: Currenthunt,hunt1 :hunt1, hunt2: hunt2}})



}
exports.postkey = (req,res)=>{
  const {id, code } = req.body
  const fresh  = new Keyboard({id:id,code:code}).save()
  return res.status(200).json({message: 'Successful'})
}

