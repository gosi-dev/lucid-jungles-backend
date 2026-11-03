const { sendErrorResponse, sendSuccessResponse } = require('../utils/response');
const {
  generateHashedPassword,
  compareHashedPassword,
  generateRefToken,
  generateRecoveryToken,
} = require('../utils/utils');
const { initializeUserSession } = require('../utils/session');
const { sendPasswordResetEmail, sendverificationMail } = require('../utils/mail');
const { sendVerificationMail } = require('../utils/mail')
const userRepository = require('../repositories/user');
const { Token } = require('../models/token')
const generateToken =  require('../utils/generatetoken');
const { User } = require('../models/user');
const path = require('path')
const {gethuntstatus }  = require('../repositories/user')

/* A bcrypt hash must not leave the server, and four of these handlers returned the whole
   user document — signup and sign-in included, so every successful login sent the hash
   back in the response body. The document is what the client needs; the hash is not.
   Returns a plain object rather than the Mongoose document so the caller cannot re-save
   a stripped record by accident. */
const publicUser = (user) => {
  if (!user) return user;
  const plain = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete plain.password;
  return plain;
};

exports.checkUsernameAvailability = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return sendErrorResponse(res, 'USERNAME_REQUIRED', {}, 400);
    }
    const existingUser = await userRepository.findUserByUsername(username);
    if (existingUser) {
      return res.status(200).json({ available: false });
    }
    return res.status(200).json({ available: true });
  } catch (err) {
    return sendErrorResponse(res, 'CHECK_USERNAME_ERROR', { err }, 500);
  }
};


exports.registerUser = async (req, res) => {
  const { email, password, username } = req.body;
  const hashedPassword = generateHashedPassword(password);
  try {
    const existingUserWithEmail = await userRepository.findUserByEmail(email);
    if (existingUserWithEmail) {
      return sendErrorResponse(res, 'EMAIL_ALREADY_EXISTS', {}, 409);
    }
    const existingUserWithUsername = await userRepository.findUserByUsername(
      username
    );
    if (existingUserWithUsername) {
      return sendErrorResponse(res, 'USERNAME_ALREADY_EXISTS', {}, 409);
    }
    //const flagged = [ 'uni1332','zar8740','pot6074','uni3882','oau8232','emm5118']
    //const referralCode = await generateRefToken(req.body);
    //if (refToken) {
     // var referredBy = await userRepository.findUserByRefToken(refToken);
      //if (!referredBy) {
      //  return sendErrorResponse(res, 'REFERRAL_TOKEN_NOT_FOUND', {}, 404);
     // }
     // if (!flagged.includes(refToken)){
      //  await userRepository.updateToken(refToken,10)

     // }
      
   // }
    const data = {
      ...req.body,
      hashedPassword,
      //refToken: referralCode,
    };
    const user = await userRepository.createUser(data);

    // Auto-assign map position for the new user (fire-and-forget — don't block registration)
    const { assignMapPosition } = require('../utils/mapPlacement');
    assignMapPosition(user._id, user.username).catch(() => {});

    // Send verification email after registration
    const user_token = generateToken();
    await new Token({
      userId: user._id,
      token: user_token
    }).save();
    const baseUrl = process.env.VERIFICATION_BASE_URL || 'http://localhost:3000/api/user';
    const url = `${baseUrl}/${user._id}/verify/${user_token}`;
    await sendverificationMail(user, url);

    //if (refToken && user) {
      //await userRepository.updateUserReferralList(referredBy, user._id);
    //}
    return sendSuccessResponse(res, 'REGISTER_USER_SUCCESS', { user: publicUser(user) }, 201);
 } catch (err) {
  
  return sendErrorResponse(res, 'USER_REGISTER_ERROR', { err }, 500);
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await userRepository.findUserByEmail(email);
    if (!user) {
      return sendErrorResponse(res, 'USER_NOT_FOUND', {}, 404);
    }
    const isValidPassword = compareHashedPassword(password, user.password);
    if (!isValidPassword) {
      return sendErrorResponse(res, 'WRONG_PASSWORD', {}, 401);
    }
    initializeUserSession(req, user);
    req.session.authenticated = true
    const huntstatus = await gethuntstatus(user._id)
    return sendSuccessResponse(res, 'LOGIN_USER_SUCCESS', { user: publicUser(user), Currenthunt: huntstatus[2],hunt1 :huntstatus[0], hunt2: huntstatus[1]}, 200);
  } catch (err) {
    return sendErrorResponse(res, 'LOGIN_USER_FAILURE', { err }, 500);
  }
};

exports.getUserProfile = async (req, res) => {
 try {




    if (req.session) {
      if (!req.session.lastVisitDate) {
        // Initialize lastVisitDate if it doesn't exist
        req.session.lastVisitDate = new Date().toISOString();
      }
    
      const lastVisitDate = new Date(req.session.lastVisitDate);
      const today = new Date();
      const daysDiff = Math.floor((today - lastVisitDate) / (1000 * 60 * 60 * 24));

      if (daysDiff > 1) {
        // Reset streak to zero
        req.session.loginStreak = 0;
      } else if (daysDiff === 1) {
        // Increment streak only if visit was yesterday (becomes 1)
        req.session.loginStreak = 1;
      } else {
        // No change to streak if visit is today (streak remains the same)
      }
    
      // Save streak to database (similar to existing code)
      
        const user_id = req.session.user;
        if (user_id) {
          const user = await User.findOneAndUpdate(
            { _id: user_id },
            { $set: { loginStreak: req.session.loginStreak }, lastVisitDate: today },
            { upsert: true, new: true }
          );
          req.session.loginStreak = user.loginStreak;
        }
      
        //console.error('Error updating login streak:', err);
      
    
      // Update lastVisitDate (same as existing code)
      req.session.lastVisitDate = new Date().toISOString();
    } else {
      // Handle case where session or user information is missing (same as existing code)
 
    }
    let { user } = req;
    const profile = await userRepository.findUserByIdWithoutPassword(user._id);
    const huntstatus = await gethuntstatus(user._id)
    return sendSuccessResponse(res, 'GET_USER_SUCCESS', { user: profile , Currenthunt: huntstatus[2],hunt1 :huntstatus[0], hunt2: huntstatus[1]}, 200);
 } catch (err) {
   return sendErrorResponse(res, 'GET_USER_FAILURE', { err }, 500);
  }
};

exports.getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username: username.toLowerCase() })
      .select('username about profile_picture level xp location fanbase loginStreak createdAt');
    if (!user) return res.status(404).json({ status: false, message: 'User not found' });
    return res.status(200).json({ status: true, data: user });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.logoutUser = (req, res) => {
  return;
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { email, username,profile_picture} = req.body;
    const existingUserWithEmail = await userRepository.findUserByEmail(email);
    if (
      existingUserWithEmail &&
      existingUserWithEmail._id.toString() !== req.user._id.toString()
    ) {
      return sendErrorResponse(res, 'EMAIL_ALREADY_EXISTS', {}, 409);
    }
    const existingUserWithUsername = await userRepository.findUserByUsername(
      username
    );
    if (
      existingUserWithUsername &&
      existingUserWithUsername._id.toString() !== req.user._id.toString()
    ) {
      return sendErrorResponse(res, 'USERNAME_ALREADY_EXISTS', {}, 409);
    }
    const data = {
      ...req.body,
    };
    const user = await userRepository.updateUser(req.user, data);
    return sendSuccessResponse(res, 'UPDATE_USER_SUCCESS', { user: publicUser(user) }, 200);
  } catch (err) {
    console.log(err);
    return sendErrorResponse(res, 'UPDATE_USER_FAILURE', { err }, 500);
  }
};

exports.updateUserPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const isValidPassword = compareHashedPassword(
      currentPassword,
      req.user.password
    );
    if (!isValidPassword) {
      return sendErrorResponse(res, 'WRONG_PASSWORD', {}, 401);
    }
    const hashedPassword = generateHashedPassword(newPassword);
    const data = {
      password: hashedPassword,
    };
    const user = await userRepository.updateUser(req.user, data);
    return sendSuccessResponse(res, 'UPDATE_PASSWORD_SUCCESS', { user: publicUser(user) }, 200);
  } catch (err) {
    return sendErrorResponse(res, 'UPDATE_PASSWORD_FAILURE', { err }, 500);
  }
};

exports.recoverUserPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userRepository.findUserByEmail(email);
    if (!user) {
      return sendErrorResponse(res, 'USER_NOT_FOUND', {}, 404);
    }
    const recoveryToken = await generateRecoveryToken(user);
    await sendPasswordResetEmail(user, recoveryToken);
    return sendSuccessResponse(
      res,
      'RECOVER_PASSWORD_INITIATED',
      { token: recoveryToken },
      200
    );
  } catch (err) {
    console.log(err);
    return sendErrorResponse(res, 'RECOVER_PASSWORD_FAILURE', { err }, 500);
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const { recoveryToken, newPassword } = req.body;
    const user = await userRepository.findUserByRecoveryToken(recoveryToken);
    if (!user) {
      return sendErrorResponse(res, 'USER_NOT_FOUND', {}, 404);
    }
    const hashedPassword = generateHashedPassword(newPassword);
    const data = {
      password: hashedPassword,
      recoveryToken: undefined,
    };
    await userRepository.updateUser(user, data);
    return sendSuccessResponse(res, 'RESET_PASSWORD_SUCCESS', {}, 200);
  } catch (err) {
    return sendErrorResponse(res, 'RESET_PASSWORD_FAILURE', { err }, 500);
  }
};

exports.Verifyuser = async (req,res) => {
  const userid = req.body.userid
  const user_token = generateToken()
  const user = await userRepository.findUserById(userid)

  await new Token(
    {
      userId: userid,
      token: user_token
    }
  ).save()
  const baseUrl = process.env.VERIFICATION_BASE_URL || 'https://api.lucidjungles.io/api/user';
  const url = `${baseUrl}/${userid}/verify/${user_token}`;
  await sendverificationMail(user, url)

  return res.status(201).json({'message': 'A verification link has been sent to your Mail'})
} 


exports.verifytoken = async (req, res) => {
  const user = await userRepository.findUserById(req.params.id);
  const token = await Token.findOne({ userId: user._id, token: req.params.user_token });
  if (!token) {
    return res.sendFile(path.join(__dirname, 'expired.html'));
  }
  await User.updateOne({ _id: user._id }, { $set: { verified: true } });
  await token.remove();
  return res.sendFile(path.join(__dirname, 'verified.html'));
};


exports.getref = async(req,res)=>{
 
  
  const Marketers = ['elemoh10@gmail.com','ishdannykeyz@gmail.com','abukingsqueenstv@gmail.com','thepottvmedia@gmail.com','kazeemoluwadamilare112@gmail.com','emmanuelichristian2002@gmail.com']
  let Markerter1
  let Markerter2
  let Markerter3
  let Markerter4
  let Markerter5
  let Markerter6
  for (let i = 0; i < Marketers.length; i++){
    const user = await User.findOne({email:Marketers[i]})
    if (Marketers[i] === 'elemoh10@gmail.com'){
      Markerter1 = user
    }
    if (Marketers[i] === 'ishdannykeyz@gmail.com'){
      Markerter2 = user
    }
    if (Marketers[i] === 'abukingsqueenstv@gmail.com'){
      Markerter3 = user
    }
    if (Marketers[i] === 'thepottvmedia@gmail.com'){
      Markerter4 = user
    }
    if (Marketers[i] === 'kazeemoluwadamilare112@gmail.com'){
      Markerter5 = user
    }
    if (Marketers[i] === 'emmanuelichristian2002@gmail.com'){
      Markerter6 = user
    }
  }
  
  return res.json({status:true, 'message':'Retrieved Succesfully', data:{Markerter1:{email:Markerter1.email,referrals:Markerter1.referrals.length,referralCode:Markerter1.refToken},
   Markerter2:{email:Markerter2.email,referrals:Markerter2.referrals.length,referralCode:Markerter2.refToken},
  Markerter3:{email:Markerter3.email,referrals:Markerter3.referrals.length,referralCode:Markerter3.refToken},
  Markerter4:{email:Markerter4.email,referrals:Markerter4.referrals.length,referralCode:Markerter4.refToken}, Markerter5:{email:Markerter5.email,referrals:Markerter5.referrals.length,referralCode:Markerter5.refToken},
  Markerter6:{email:Markerter6.email,referrals:Markerter6.referrals.length,referralCode:Markerter6.refToken}}})
  
}