const { sendErrorResponse, sendSuccessResponse } = require('../utils/response');
const userRepository = require('../repositories/user');
const avatarRepository = require('../repositories/avatar');
const {Avatar} = require('../models/avatar')
const {User} = require('../models/user')
const fs = require("fs")
const multer = require('multer')
const { upload } = require('../utils/s3')


exports.createAvatar =  async(req,res)=>{
  
  
  const {userid,lucidmoji,background, hair,eye,jacket,shirt,mouth,skin} = req.body
  const background_color = background.color
  const hairtype = hair.type
  const haircolor = hair.color
  const eyetype = eye.type
  const jacket_type = jacket.type
  const jacket_color = jacket.color
  const shirt_type = shirt.type
  const shirt_color = shirt.color
  const mouth_type = mouth.type
  const skin_color =skin.color
  
  const base64Data = lucidmoji.replace("data:image/svg+xml;charset=utf-8;base64,", "")
  const type = lucidmoji.split(';')[0].split('/')[1].split('+')[0];
  

  const upload_to_aws = await upload(base64Data,userid,type)

  


  

 const useravatar =  await new Avatar({userid:userid,
    background: {color:background_color},
    hair:{type:hairtype,color:haircolor},
    eye:{type:eyetype},
    jacket:{type: jacket_type,color:jacket_color},
    shirt:{type: shirt_type,color:shirt_color},
    mouth:{type:mouth_type },
    skin:{color: skin_color},
    lucidmoji: upload_to_aws.Location






  
  })
  await User.updateOne({_id: userid},{profile_picture:upload_to_aws.Location})
  await useravatar.save()
  
  return res.status(200).json({status: true,'message': 'Data Saved',lucidmoji: upload_to_aws.Location})
  
}





exports.updateAvatar =async( req,res)=>{
  const {userid,lucidmoji,background, hair,eye,jacket,shirt,mouth,skin} = req.body
  const background_color = background.color
  const hairtype = hair.type
  const haircolor = hair.color
  const eyetype = eye.type
  const jacket_type = jacket.type
  const jacket_color = jacket.color
  const shirt_type = shirt.type
  const shirt_color = shirt.color
  const mouth_type = mouth.type
  const skin_color =skin.color

 try{
  const user =  await User.findById(userid)
  
  if(user){
      const base64Data = lucidmoji.replace("data:image/svg+xml;charset=utf-8;base64,", "")
      const type = lucidmoji.split(';')[0].split('/')[1].split('+')[0];
      const upload_to_aws = await upload(base64Data,userid,type)

      await Avatar.updateOne({userid: userid},

      {background: {color:background_color}}),

      await Avatar.updateOne({userid: userid},   {hair:{type:hairtype,color:haircolor}})

      await Avatar.updateOne({userid: userid}, {eye:{type:eyetype}})

      await Avatar.updateOne({userid: userid},  {jacket:{type: jacket_type,color:jacket_color}})

      await Avatar.updateOne({userid: userid},{shirt:{type: shirt_type,color:shirt_color}})

      await Avatar.updateOne({userid: userid}, { mouth:{type:mouth_type }})

      await Avatar.updateOne({userid: userid},{skin:{color: skin_color}})

      await Avatar.updateOne({userid: userid}, {lucidmoji:upload_to_aws.Location})


      await User.updateOne({_id: userid},{profile_picture:upload_to_aws.Location})
      return res.status(200).json({status:true, 'message': 'Avatar Updated Successfully',lucidmoji: upload_to_aws.Location})
  }
  
}
catch{

  return res.status(502).json({'status': true, 'message': 'Network error'})

}
}






exports.getUserAvatar = async (req, res) => {
  const user = await userRepository.findUserById(req.user._id);
  if (!user) {
    return sendErrorResponse(res, 'USER_NOT_FOUND', {}, 404);
  }
  const avatar = await avatarRepository.findUserAvatar(user);
  if (!avatar) {
    return sendErrorResponse(res, 'AVATAR_NOT_FOUND', {}, 404);
  }
  return sendSuccessResponse(res, 'AVATAR_FOUND', { avatar });
};

exports.uploadUserAvatar = async (req, res) => {
  const user = await userRepository.findUserById(req.user._id);
  if (!user) {
    return sendErrorResponse(res, 'USER_NOT_FOUND', {}, 404);
  }
  const avatar = await avatarRepository.saveAvatarSnapshot(
    user,
    req.file.location
  );
  if (!avatar) {
    return sendErrorResponse(res, 'AVATAR_SNAPSHOT_SAVE_FAILED', {}, 404);
  }
  return sendSuccessResponse(res, 'AVATAR_SNAPSHOT_SAVE_SUCCESS', { avatar });
};

exports.saveUserAvatar = async (req, res) => {
  const user = await userRepository.findUserById(req.user._id);
  if (!user) {
    return sendErrorResponse(res, 'USER_NOT_FOUND', {}, 404);
  }
  const avatar = await avatarRepository.updateUserAvatar(user, req.body);
  if (!avatar) {
    return sendErrorResponse(res, 'AVATAR_NOT_FOUND', {}, 404);
  }
  return sendSuccessResponse(res, 'AVATAR_FOUND', { avatar });
};
