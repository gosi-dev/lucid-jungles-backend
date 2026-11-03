const { sendErrorResponse, sendSuccessResponse } = require('../utils/response');
const userRepository = require('../repositories/user');
const { User } = require('../models/user');

exports.retrieveAllUsers = async (req, res) => {
  try {
    const users = await userRepository.findAllUsersAndCount();
    return sendSuccessResponse(res, 'USERS_RETRIEVE_SUCCESS', {
      users: users,
    });
  } catch (error) {
    console.log(error);
    return sendErrorResponse(res, 'SOMETHING_WENT_WRONG', {}, 404);
  }
};

exports.leaderboard = async(req,res)=>{
  try{
    const board = await User.find().sort({xp: -1}).select("first_name _id xp username")

    res.status(200).json({status: true,message: "Retrieved", data: board})

    
  }
  catch(err){
    res.status(500).json({status:false, messsage: err})
  }
}



exports.update_experience_points = async (req, res) => {
  const user_id =  req.session.user
  const { points } = req.body;
  

    try {
    const user = await User.findOne({ _id: user_id });
  
    

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Update XP and check for level upgrade
    user.xp += points;
    if (user.xp >= 5000) {
        user.level = 'Initiate';
    } else if (user.xp >= 1000) {
        user.level = 'Seeker';
    }
    else if (user.xp >= 10000) {
      user.level = 'Champion';
  }
  else if (user.xp >= 20000) {
      user.level = 'Seer';
  }
  else if (user.xp >= 50000) {
      user.level = 'Alchemist';
  }
  else if (user.xp >= 100000) {
      user.level = 'Shaman';
  }

    // Save the updated user object
    await user.save();



      return res.status(200).json({
        status: true,
        message: `${points} experience points(XP) has been added successfully`,
      });
    
    /*
        const add_new = new Reward({userId: userid, Tunes: Tunes}).save()

        return res.status(200).json({status: true, message: `${Tunes} has been added successfully`})
        */
  } catch {
    return res.status(502).json({ status: false, message: "Network error" });
  }
};

exports.uploadmedia = async(req,res)=>{
  //try{
  
 // https://storage.googleapis.com/BUCKET_NAME/OBJECT_NAME
  const key = req.files[0].filename
  const url = req.files[0].path


  const data = {
      url,
      key
  }




  return res.status(200).json({status:true, data: data})
//}
//catch(err){
//  return res.status(500).json({status:false, message: "An error occured during upload"})
  
//}

}

exports.collect_items = async(req,res)=>{
  try {

      const user_id =  req.session.user


  const { itemName } = req.body;

  const user = await User.findOne({_id: user_id});
  if (!user) {
      return res.status(404).json({ message: 'User not found' });
  }
  const existingItem = user.collectedItems.find(item => item.itemName === itemName);
  if (existingItem) {
  const existingItem = user.collectedItems.find(item => item.itemName === itemName);
        // If the item exists, increment its count
        existingItem.itemCount++;
      } else {
          // If the item doesn't exist, add it to collectedItems array
          user.collectedItems.push({ itemName, itemCount: 1 });
      }

      // Save the updated user object
      await user.save();

      res.status(201).json({ message: 'Item collected successfully'});
  } catch (err) {
  }
  
}