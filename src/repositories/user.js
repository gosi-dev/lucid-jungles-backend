const { User } = require('../models/user');
const { SecondHunt} = require('../models/secondhunt')
const { Reward } = require('../models/user_reward')
exports.findUserByUsername = async (username) => {
  return User.findOne({
    username: username.toLowerCase(),
  });
};

exports.findUserByEmail = async (email) => {
  return User.findOne({
    email: email.toLowerCase(),
  });
};

exports.findUserById = async (id) => {
  return User.findOne({
    _id: id,
  });
};

exports.findUserByIdWithoutPassword = async (id) => {
  return User.findOne({
    _id: id,
  }).select('-password');
};

exports.createUser = async (data) => {
  const { email, hashedPassword, username, refToken } = data;
  return await new User({
    email: email.toLowerCase(),
    password: hashedPassword,
    username: username.toLowerCase(),
    idiokToken: 20,
    refToken,
  }).save();
};

exports.findUserByRefToken = async (refToken) => {
  return User.findOne({
    refToken,
  });
};

exports.findUserByRecoveryToken = async (token) => {
  return User.findOne({
    recoveryToken: token,
  });
};

exports.updateUserReferralList = async (user, referralId) => {
  return User.findOneAndUpdate(
    {
      _id: user._id,
    },
    {
      $push: {
        referrals: {
          $each: [referralId],
          $position: 0,
        },
      },
    },
    {
      new: true,
    }
  );
};

exports.updateToken = async( token,reward) =>{
  return User.findOneAndUpdate({

    refToken: token
  },
  {
    $inc:{
      idiokToken: reward
    }


  }
    
  )
}
exports.updateHuntToken = async (userid, reward)=>{
  return User.findOneAndUpdate({
    _id: userid
  },
  {
    $inc:{
      idiokToken: reward
    }
  })
}

exports.updateUser = async (user, data) => {
  return User.findOneAndUpdate(
    {
      _id: user._id,
    },
    {
      $set: data,
    },
    {
      new: true,
    }
  );
};

exports.findAllUsers = async () => {
  return User.find();
};

exports.findAllUsersAndCount = async () => {
  return User.find().count();
};

exports.UpdateHint = async (userid,id,key) =>{
  const Hint= ['Hint1', 'Hint2', 'Hint3', 'Hint4', 'Hint5', 'Hint6', 'Hint7']
  var conditions = { "userId": userid },
        update = { "$set": {} };
        update["$set"]["hints."+key] = Hint[id]
        return SecondHunt.updateOne(conditions,update)


}

exports.gethuntstatus =  async (userid) =>{
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
  

  return [hunt1,hunt2,Currenthunt]





}