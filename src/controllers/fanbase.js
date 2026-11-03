const { Fanbase } = require("../models/fanbase")
const { FanbaseMembership } = require("../models/fanbaseMembership")
const { User } = require("../models/user")
const Flutterwave = require('flutterwave-node-v3')

const { v4: uuidv4 } = require('uuid')
const generateTxRef = () => `lj-fanbase-${uuidv4()}`






exports.create_fanbase = async(req,res)=>{
    try{

    
   
    
   const {name} = req.body
   const create = new Fanbase({ creator: req.session.user, name: name})
   await create.save()


   res.status(200).json({status: true, message: "Created successfully"})
    }

    catch(err){
        return res.status(500).json({status:false, message:err})
    }
   

}

exports.add_fanbase_map = async(req,res)=>{
    try{

        const fanbase_id = req.params.fanbaseId
        const {custom_name, category} = req.body
        const map = await Fanbase.findById({fanbase_id})
        if(map && map.creator == req.session.user){
            
            map.fanbase_map.push({custom_name:custom_name, category: category})
            await map.save()

        }

        if(map.creator != req.session.user){
            return res.status(401).json({status: false, message: "Unauthorized access"})
        }


    }
    catch(err){
        return res.status(500).json({status:false, message:err})
    }
}
exports.create_community_goal = async(req,res)=>{
    //try{

        const fanbase_id = req.params.fanbaseId
        const {goal_name,description, cover_photo, progress} = req.body
        const map = await Fanbase.findById(fanbase_id)
        if(map && map.creator == req.session.user){
            
            map.community_goals.push({goal_name: goal_name, goal_description: description, cover_photo: cover_photo, progress})
            await map.save()
            return res.status(200).json({status: true, message: "Successful"})

        }

        if(map.creator != req.session.user){
            return res.status(401).json({status: false, message: "Unauthorized access"})
        }


    //}
    //catch(err){
        //return res.status(500).json({status:false, message:err})
    //}
}
exports.fetch_fanbase = async(req,res)=>{

    try{
        const fanbase_id = req.params.fanbaseId
        const fanbase = await Fanbase.findById(fanbase_id)

        res.status(200).json({status: true, message: "fecthced Succesfully", data: fanbase})

    }
    catch(err){
        return res.status(500).json({status:false, message:err})
    }
}

exports.fectch_all_fanbase = async(req, res) =>{
    try{

        
        const fanbase = await Fanbase.find().populate("members", "username email")

        res.status(200).json({status:true, message: "Fetched successfully", data: fanbase})
    }
    catch(err){
        return res.status(500).json({status:false, message:err})
    }
}

exports.join_fanbase = async(req, res) => {
    try {
        const { fanbase_id } = req.body
        const userId = req.session.user

        const fanbase = await Fanbase.findById(fanbase_id)
        if (!fanbase) {
            return res.status(404).json({ status: false, message: "Fanbase not found" })
        }

        // Check already a member
        const existingMembership = await FanbaseMembership.findOne({ userId, fanbaseId: fanbase_id })
        if (existingMembership) {
            return res.status(400).json({ status: false, message: "Already a member of this Fanbase" })
        }

        const user = await User.findById(userId)

        // FREE fanbase — join immediately
        if (!fanbase.isPaid) {
            const membership = new FanbaseMembership({ userId, fanbaseId: fanbase_id })
            await membership.save()

            fanbase.members.push(userId)
            fanbase.total_members += 1
            user.fanbase.push(fanbase._id)
            await fanbase.save()
            await user.save()

            return res.status(200).json({
                status: true,
                message: "Joined Fanbase successfully",
                data: { membershipId: membership._id, isPaid: false, fanbaseType: fanbase.fanbaseType }
            })
        }

        // PAID fanbase — create pending membership and return Flutterwave payload for frontend to initialise payment
        const tx_ref = generateTxRef()

        // Create pending membership record — marked incomplete until payment validated
        const membership = new FanbaseMembership({
            userId,
            fanbaseId: fanbase_id,
            paymentRef: tx_ref,
            amountPaid: fanbase.membershipFee,
            currency: fanbase.currency,
            onboardingComplete: false
        })
        await membership.save()

        const paymentPayload = {
            public_key: process.env.FLW_PUBLIC_KEY,
            tx_ref,
            amount: fanbase.membershipFee,
            currency: fanbase.currency,
            payment_options: "card",
            redirect_url: `${process.env.VERIFICATION_BASE_URL}/fanbase/${fanbase_id}/join-success`,
            meta: {
                fanbase_id: fanbase._id.toString(),
                membership_id: membership._id.toString(),
                user_id: userId.toString()
            },
            customer: {
                email: user.email,
                phone_number: user.phone_number || "",
                name: user.username
            },
            customizations: {
                title: fanbase.name,
                description: `Membership — ${fanbase.name}`
            }
        }

        return res.status(200).json({
            status: true,
            message: "Payment required",
            data: { requiresPayment: true, paymentPayload, tx_ref, fanbaseType: fanbase.fanbaseType }
        })

    } catch (err) {
        return res.status(500).json({ status: false, message: err.message || err })
    }
}

// Called after Flutterwave redirects back — validates payment and activates membership
exports.validate_fanbase_payment = async(req, res) => {
    try {
        const { transaction_id, tx_ref } = req.body
        const userId = req.session.user

        const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.SECRET_KEY)
        const response = await flw.Transaction.verify({ id: transaction_id })

        if (response.data?.status !== 'successful') {
            return res.status(400).json({ status: false, message: "Payment not successful" })
        }

        // Activate the membership
        const membership = await FanbaseMembership.findOne({ paymentRef: tx_ref })
        if (!membership) {
            return res.status(404).json({ status: false, message: "Membership record not found" })
        }

        const fanbase = await Fanbase.findById(membership.fanbaseId)
        const user = await User.findById(userId)

        // Add to fanbase members list
        if (!fanbase.members.includes(userId)) {
            fanbase.members.push(userId)
            fanbase.total_members += 1
            user.fanbase.push(fanbase._id)
            await fanbase.save()
            await user.save()
        }

        return res.status(200).json({
            status: true,
            message: "Payment validated. Welcome to the Fanbase.",
            data: { membershipId: membership._id, fanbaseType: fanbase.fanbaseType }
        })

    } catch (err) {
        return res.status(500).json({ status: false, message: err.message || err })
    }
}

/* ---------------------------------------------------
   POST /api/fanbase/:fanbaseId/onboarding
   Saves Dojo fitness answers to the member's FanbaseMembership.
   Body: { currentBodyShape, goalBodyShape, fitnessGoal, daysPerWeek, equipment, avoid }
   Only works for fitness-type Fanbases.
--------------------------------------------------- */
exports.complete_onboarding = async (req, res) => {
    try {
        const userId = req.session.user
        const { fanbaseId } = req.params
        const { currentBodyShape, goalBodyShape, fitnessGoal, daysPerWeek, equipment, avoid,
                heightCm, weightKg, desiredWeightKg } = req.body

        const membership = await FanbaseMembership.findOne({ userId, fanbaseId })
        if (!membership) return res.status(404).json({ error: 'Not a member of this Fanbase' })

        if (membership.onboardingComplete) {
            return res.status(400).json({ error: 'Onboarding already completed' })
        }

        // Validate required fields
        if (!currentBodyShape || !goalBodyShape || !fitnessGoal || !daysPerWeek || !equipment) {
            return res.status(400).json({ error: 'Missing required onboarding fields' })
        }

        membership.currentBodyShape  = currentBodyShape
        membership.goalBodyShape      = goalBodyShape
        membership.fitnessGoal        = fitnessGoal
        membership.daysPerWeek        = parseInt(daysPerWeek, 10)
        membership.equipment          = equipment
        membership.avoid              = avoid || ''
        if (heightCm)        membership.heightCm        = parseFloat(heightCm)
        if (weightKg)        membership.weightKg        = parseFloat(weightKg)
        if (desiredWeightKg) membership.desiredWeightKg = parseFloat(desiredWeightKg)
        membership.onboardingComplete = true
        await membership.save()

        res.json({ status: true, membership })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// GET /api/fanbase/my-dojo
// Returns the single fitness Fanbase + user's membership status (member or not)
exports.my_dojo = async (req, res) => {
    try {
        const { FanbaseMembership } = require('../models/fanbaseMembership')
        const { Fanbase } = require('../models/fanbase')

        // Find THE Dojo — the single fitness Fanbase on the platform
        const fanbase = await Fanbase.findOne({ fanbaseType: 'fitness' })
        if (!fanbase) return res.json({ status: false, fanbase: null, membership: null })

        // Check if user is already a member
        const membership = await FanbaseMembership.findOne({
            userId: req.session.user,
            fanbaseId: fanbase._id
        })

        res.json({
            status: true,
            fanbase,
            membership: membership || null,
            isMember: !!membership,
            onboardingComplete: membership?.onboardingComplete || false
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

