const {Store} = require("../models/store")
const {Product} = require('../models/products')
const { User } = require("../models/user")
const { Cart } = require("../models/cart")
const { Favourites } = require("../models/favourites")
const { response, json } = require("express")
const { Order } = require("../models/order")
const { Address } = require("../models/address")
const { getCartTotalPrice, calculateCartTotal, generateTxRef, generateorderId, create_shipment, quote_shipping_fee } = require("../utils/checkout")
const { generate } = require("shortid")
const { default: mongoose } = require("mongoose")
const Flutterwave = require('flutterwave-node-v3');
const { default: axios } = require("axios")
const moment = require("moment")

// How many of a product are left to sell. The catalogue filters on `instock`, but `quantity` is
// the number the shopkeeper actually has, so 0 (or a missing/garbage value) means there is
// nothing to sell even when the flag still says true. Note the schema's `default: true`, which
// Mongoose casts to 1, so a product created without a quantity reads as "one left".
function stock_limit(product) {
  const n = Number(product && product.quantity)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

exports.fetch_all_products_public = async (req, res) => {
  try {
    const { Product } = require('../models/products');
    const products = await Product.find({ instock: true }).sort({ createdAt: -1 });
    res.status(200).json({ status: true, data: products });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.create_store = async(req,res)=>{

    try{


    const {name, location} = req.body

    const new_store = new Store({name: name, location: location})

    await new_store.save()

    return res.status(200).json({status: true, message: "Store created Successfully"})
    }
    catch(err){
        return res.status(500).json({status: false, err})
    }




}

exports.fectch_all_store = async(req,res)=>{
    try{
        
        const stores = await Store.find().populate("products")
        res.status(200).json({status: true, data: stores})


    }
    catch(err){

    }
}
exports.fetch_all_products =async(req,res)=>{
    try{
    const {store_id} = req.params
    const products = await Store.findById(store_id).populate("products")
    res.status(200).json({status: true, data: products})
    }
    catch(err){
        res.status(500).json({status:false, message: err})
    }

}

exports.fetch_product = async(req,res)=>{
  try{
    const product = req.params.productId

    const item = await Product.findById(product)
    res.status(200).json({status: true, data: item})

  }
  catch(err){
    res.status(500).json({status: false, message: err})

  }
}
exports.add_product_to_store = async(req,res)=>{
    try{

    const store_id = req.params.storeId
    const store = await Store.findById(store_id)
    
    const {name, price, description,instock, quantity, } = req.body

    const product = new Product({name: name, price: price,description: description, instock: instock, quantity: quantity , store: store_id})

   await product.save()
   store.products.push(product._id);
   await store.save()

   res.status(200).json({status: "true", message: "Product added Successfully", data: product})
    }
    catch(err){
        return res.status(500).json({status:false, message:err})
    }

}


exports.add_item_to_cart = async(req,res)=>{
    try{
    const userid = req.session.user
    const user = await User.findById(userid)
    if (!user) {
        return res.status(404).json({status: false, message: "User not found"})
    }

    const {productId} = req.body
    // The quantity used to be pushed straight through, so `{product, quantity: undefined}` and
    // `quantity: -3` both became cart lines. A negative line quietly *subtracts* from the
    // subtotal the client prints, which is why the check belongs here and not in the UI.
    const quantity = req.body.quantity === undefined ? 1 : Number(req.body.quantity)
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({status: false, message: "A valid productId is required"})
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({status: false, message: "quantity must be a whole number of 1 or more"})
    }

    const product = await Product.findById(productId)
    if (!product) {
        return res.status(404).json({status: false, message: "Product not found"})
    }
    // The public catalogue already hides out-of-stock items; this is the same rule on the write
    // path, so a stale tab (or curl) cannot put something that is no longer for sale in a cart.
    if (product.instock === false) {
        return res.status(400).json({status: false, message: "Product is out of stock"})
    }
    // ...and the flag is not the whole story: `quantity` is what the shop has left. The check is
    // made against the line that would *result* from the add, so two presses cannot walk past the
    // shelf — and it happens before anything is written, so a refused add changes nothing.
    const limit = stock_limit(product)
    if (limit === 0) {
        return res.status(400).json({status: false, message: `There is none of "${product.name}" left`})
    }

    // Read the existing line before creating anything: a refused add should not leave an empty
    // cart behind as a souvenir of the attempt.
    let cart = user.cart ? await Cart.findById(user.cart?._id || user.cart) : null
    const inCart = cart?.products.find(item => item.product.toString() === productId)?.quantity || 0
    const nextQuantity = inCart + quantity
    if (nextQuantity > limit) {
        return res.status(400).json({
            status: false,
            message: inCart > 0
                ? `Only ${limit} of "${product.name}" are left and ${inCart} ${inCart === 1 ? 'is' : 'are'} already in your cart`
                : `Only ${limit} of "${product.name}" are left`,
        })
    }

    if(!cart){
        cart = new Cart({user: user._id, })
        await cart.save()

        user.cart = cart._id
        await user.save()
    }

    const productIndex = cart.products.findIndex(cartItem => cartItem.product.toString() === productId);
    if (productIndex > -1){
        cart.products[productIndex].quantity = nextQuantity

    }
    else{
        cart.products.push({product: productId, quantity: quantity})
    }
    await cart.save();
    return res.status(200).json({status:true, message: "Product has been added to cart succesfully"})

   
   

}

catch(err){

    return res.status(500).json({status: false, message: err.message || String(err)})

}
}


exports.add_to_favourites= async( req,res)=>{
    try{

   
        const userid = req.session.user
        const user = await User.findById(userid)
        const {productId} = req.body
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({status: false, message: "A valid productId is required"})
        }
        const product = await Product.findById(productId)
        if (!product) {
            return res.status(404).json({status: false, message: "Product not found"})
        }
        if(!user.favourites){
            const favourites = new Favourites({user: user._id, })
            await favourites.save()
    
            user.favourites = favourites._id
            await user.save()
            
        }
    
            const favourites = await Favourites.findById(user.favourites._id)
            const productIndex = favourites.products.findIndex(favItem => favItem.product.toString() === productId);
            if (productIndex > -1){
              return res.status(403).json({status: false, message: "Product exists already"})
    
            }
            else{
                favourites.products.push({product: productId})
            }
            
            await favourites.save();
            return res.status(200).json({status:true, message: "Product has been added to favourites succesfully"})
}catch(err){
    return res.status(500).json({status:false, message: err})
        
}
}
exports.remove_from_favourites = async(req,res)=>{

  try{
    const {productId} = req.params
    const user_id = req.session.user

    const user = await User.findById(user_id).populate("favourites")
    // A user who has never saved anything has no favourites document at all. Dereferencing it
    // used to throw, and with no try/catch here that was a hung request rather than a 404.
    if (!user?.favourites) {
      return res.status(404).json({status: false, message: "No favourites saved yet"})
    }
    const favourites = await Favourites.findById(user.favourites._id)
    if (!favourites) {
      return res.status(404).json({status: false, message: "No favourites saved yet"})
    }

    const before = favourites.products.length
    favourites.products = favourites.products.filter(favItem => favItem.product.toString() !== productId)
    if (favourites.products.length === before) {
      return res.status(404).json({status: false, message: "Product is not in your favourites"})
    }
    await favourites.save()
    return res.status(200).json({status: true, message: "Item has been removed from Favourites successfully"})
  }
  catch(err){
    return res.status(500).json({status: false, message: err.message || String(err)})
  }
}

exports.fecth_favourites = async(req,res)=>{

    try{
    const user_id = req.session.user
    const user= await User.findById(user_id)
    if (!user?.favourites) {
        // Nothing saved yet is an empty list, not an error.
        return res.status(200).json({status: true, data: null})
    }
    // products.product was left as bare ObjectIds, so a client had nothing to render but id
    // strings — no name, no price, no image. That is why this endpoint had no UI.
    const favourites = await Favourites.findById(user.favourites).populate('products.product')
    return res.status(200).json({status: true, data: favourites})
    }
    catch(err){
        return res.status(500).json({status: false, message: err.message || String(err)})
    }
}


exports.edit_cart = async(req,res)=>{
  const {cartId} = req.params
  const{items } = req.body

  if(!Array.isArray(items) || items.length === 0){
    return res.status(400).json({status: false, message: "Items cannot be an empty array"})
  }
  try{

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      return res.status(400).json({status: false, message: "A valid cartId is required"})
    }

    // Ownership first: the handler used to go straight to bulkWrite with whatever id the URL
    // carried, so anyone holding a cart id could rewrite another shopper's quantities.
    const cart = await Cart.findById(cartId)
    if (!cart) {
      return res.status(404).json({status: false, message: "No matching cart found"})
    }
    if (String(cart.user) !== String(req.session.user)) {
      return res.status(403).json({status: false, message: "This cart belongs to another user"})
    }

    // Quantity 0 is not a removal: it used to be filtered out, the line kept its old quantity,
    // and the caller was told "Cart updated". Deletion is DELETE /:productId/remove_from_cart.
    const invaliditems = items.filter(item =>
      !mongoose.Types.ObjectId.isValid(item.productId) ||
      !Number.isInteger(Number(item.quantity)) ||
      Number(item.quantity) < 1
    )
    if (invaliditems.length > 0) {
      return res.status(400).json({status: false, message: "Every item needs a valid productId and a quantity of 1 or more"})
    }

    const validitems = items.filter(item=>
      item.quantity> 0
    )

    // The same shelf as add_item_to_cart. Without it the stepper on /cart was a way round the
    // limit: refuse 6 of something with 2 left, then press + five times instead.
    const wantedIds = [...new Set(validitems.map(item => String(item.productId)))]
    const products = await Product.find({ _id: { $in: wantedIds } })
    const limits = new Map(products.map(p => [String(p._id), stock_limit(p)]))
    const tooMany = validitems.find(item =>
      Number(item.quantity) > (limits.get(String(item.productId)) || 0)
    )
    if (tooMany) {
      const name = products.find(p => String(p._id) === String(tooMany.productId))?.name
      const left = limits.get(String(tooMany.productId)) || 0
      return res.status(400).json({
        status: false,
        message: left === 0
          ? `${name ? `"${name}"` : 'That product'} is out of stock`
          : `Only ${left} ${left === 1 ? 'is' : 'are'} left of ${name ? `"${name}"` : 'that product'}`,
      })
    }

    const bulkoperation = validitems.map(item=>({
      updateOne:{
        filter:{_id: mongoose.Types.ObjectId(cartId), 'products.product': mongoose.Types.ObjectId(item.productId)},
        update:{$set: {'products.$.quantity': Number(item.quantity)}}

      }
    }))
          const result = await Cart.bulkWrite(bulkoperation);

          // matchedCount, not modifiedCount: setting a quantity to the number it already is
          // matches the line and modifies nothing, and that answered 404 "No matching cart
          // found" — for a cart that plainly does match.
          if (result.matchedCount == 0){
            return res.status(404).json({status: false, message: "No matching cart item found"})
          }

          const updatedcart = await Cart.findById(cartId).populate('products.product')

          return res.status(200).json({status: true, message: "Cart updated", data: updatedcart})

  }
  catch(err){
    return res.status(500).json({status: false, message: err.message || String(err)})
    
  }

}
exports.delete_item_from_cart = async(req,res)=>{
    try{

    const userid = req.session.user
    // Was `const productId = req.params` — the params *object*, not the id. Every comparison
    // below therefore failed (no subdocument's product equals "[object Object]"), so the item
    // stayed in the cart and the handler answered twice on the way out (400, then 200).
    const { productId } = req.params
    const user = await User.findById(userid).populate('cart')
    const cart = await Cart.findById(user.cart._id)
    if (!cart) {
        return res.status(404).json({status: false, message: "Cart not found"})
    }
    const before = cart.products.length
    cart.products = cart.products.filter(cartItem => cartItem.product.toString() !== productId)
    if (cart.products.length === before) {
        return res.status(404).json({status: false, message: "Product does not exist in cart"})
    }
    await cart.save()
    return res.status(200).json({status: true, message: "Item removed successfully"})
    }
    catch(err){

        return res.status(500).json({status: false, message: err.message || String(err)}
            )

    }

}

exports.fecth_user_cart  = async(req,res)=>{
    try{
    const  userid = req.session.user

    const user = await User.findById(userid).populate({
        path: 'cart',
        populate: {path: 'products.product'}
    })

    res.status(200).json({status: true, message: "Cart fetched Succesflly", data: user.cart})
}
catch(err){
    res.status(500).json({status: false, message: err})
}
}

exports.create_Shipping_Address= async(req,res)=>{
    try{

    const {recipient_name, shipping_address,state, city, postal_code,country, country_code, full_address} = req.body

    const user = req.session.user
    const create = Address.create({
        user: user,
        recipient_name: recipient_name,
        shipping_address: shipping_address,
        state: state,
        city: city,
        postal_code: postal_code,
        country: country,
        country_code: country_code,
        full_address: full_address
    })
    
    res.status(200).json({status: true, message: "Operation Successful"})
} catch(err){
    res.status(500).json({status:false, data: err})
}


}
exports.fetch_user_address = async(req,res)=>{
    try{
    const user = req.session.user

    const find = await Address.find({user: user})
    res.status(200).json({status: true, message: "Retrieved Successfully", data: find})
    }
    catch(err){
        res.status(500).json({status: false, message: err})
    }
}
exports.edit_address = async(req,res)=>{

    const user = req.session.user
    const {address_id, shipping_address,state, city, postal_code,country, country_code, full_address} = req.body

    const check = await Address.findById(address_id)
    if (check.user != user){
       return res.status(401).json({status: false, message: "Unauthorized access"})
    }
    const address =  await Address.updateOne({_id:address_id},{$set: {
        shipping_address: shipping_address,
    state: state,
    city: city,
    postal_code: postal_code,
    country: country,
    country_code: country_code,
    full_address: full_address



    }})
    
   return  res.status(200).json({status: true, message: "Updated succesfully"})

}
// POST /api/store/checkout — creates the order, then hands the client what it needs to pay.
//
// This is the handler that made "0 orders" possible. It quoted shipping through the dead
// api-mock.dhl.com endpoint with no timeout, and had no try/catch, so the quote's instant TLS
// failure became an unhandled rejection: Express never wrote a response, PLACE ORDER spun
// forever, and no Order was ever created. The quote is now optional and every path answers
// exactly once.
exports.checkout = async(req,res)=>{
    let session = null
    try {

    const user  = req.session.user
    const email = req.user?.email
    

    
    const {address_id, store_id} = req.body

    // Validated up front, while nothing has been written yet.
    if (!mongoose.Types.ObjectId.isValid(address_id)) {
        return res.status(400).json({status: false, message: "A saved shipping address is required"})
    }
    const address = await Address.findById(address_id)
    if (!address) {
        return res.status(404).json({status: false, message: "Shipping address not found"})
    }
    if (String(address.user) !== String(user)) {
        return res.status(403).json({status: false, message: "That shipping address belongs to another user"})
    }

    const tx_ref = generateTxRef()
    const order_id = generateorderId()

    const options = {
        method: 'GET',
        url: 'https://api-mock.dhl.com/mydhlapi/rates',
    qs: {
    accountNumber: 123456789,
    originCountryCode: 'NG',
    originCityName: 'Lagos',
    destinationCountryCode: 'NG',
    destinationCityName: 'Akure',
    destinationPostalCode: 14800,
    weight: 5,
    length: 15,
    width: 10,
    height: 5,
    plannedShippingDate: '2024-06-06',
    isCustomsDeclarable: "false",
    unitOfMeasurement: 'metric'
  },
  headers: {
   
    Authorization: 'Basic ZGVtby1rZXk6ZGVtby1zZWNyZXQ=',
    //"X-API-KEY": "7sxL1CA8GjPIZncX"
  }
};

 
    
    
    
    const payment_method = "Card"

    // Find the user's cart
    const cart = await Cart.findOne({ user: user}).populate('products.product');
    if (!cart || cart.products.length === 0) {
        return res.status(400).json({status: false, message: "Your cart is empty"})
    }
   

    // Aggregate the products and calculate the total amount if needed
    const products = cart.products.map(item => ({
        product: item.product._id,
        quantity: item.quantity
    }));
    const productTotal = cart.products.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    // The order's store is the store the goods come from — read off the products rather than
    // trusted from the body, which used to be able to name any store it liked.
    const storeId = store_id || cart.products[0].product.store
    const store = await Store.findById(storeId)
    if (!store) {
        return res.status(404).json({status: false, message: "Store not found"})
    }
    // Each product carries its own currency; the store sells in one at a time today. The old
    // payload hardcoded "currency: 'US'", which is not a currency code Flutterwave accepts.
    const currency = cart.products[0].product.currency || "USD"

    // Bounded and optional — see quote_shipping_fee. shipping_quoted:false means the shipping
    // service could not be reached, so no fee is charged and the client says so out loud
    // instead of folding an invented number into the total.
    const {shipping_fee, shipping_quoted} = await quote_shipping_fee(options)
    const totalAmount = productTotal + shipping_fee

    // Atlas runs as a replica set, so this transaction is real. Without one, a failure after
    // the order row was written would leave a store pointing at an order that never existed.
    session = await mongoose.startSession()
    session.startTransaction()
       
    const [new_order] = await Order.create([{
        order_id: order_id,
        user: user,     
        order_date: new Date(),
        shippingDetails: address_id,
        products: products,
        total_amount: totalAmount,
        shipping_fee,
        payment_method,
        tx_ref: tx_ref,
        store: storeId
        


    }], { session })
    // The store keeps its own list of its orders, written in the same transaction: otherwise a
    // failure here leaves a store that never learns about an order that exists.
    store.orders.push(new_order._id)
    await store.save({ session })
 

    
    await session.commitTransaction();
    session.endSession();
    session = null;

  const data =  {
        order_id: new_order.order_id,
        // Same key the server verifies payments with; the hardcoded test key stays as the
        // fallback so an unset env var does not silently produce an empty modal.
        public_key: process.env.FLW_PUBLIC_KEY || "FLWPUBK_TEST-c8a2b7f3c6a18c954c37041ac5e91bb3-X",
        tx_ref:tx_ref,
        amount: totalAmount,
        currency: currency,
        payment_options: "card",
        redirect_url: "",
        meta: {
          consumer_id: user,
          consumer_mac: address_id,
        },
        customer: {
          email: email,
          phone_number: "",
          name: address.recipient_name,
        },
        customizations: {
          title: "lucidJungles",
        },
        productTotal,
        shipping_fee,
        shipping_quoted
      }
      
    return res.status(200).json({
        status: true,
        message: shipping_quoted
            ? "Order created. Complete payment to finish it."
            : "Order created. The shipping quote service was unreachable, so no shipping fee was charged.",
        data
    })

    }
    catch(err){
        if (session) {
            // An abandoned transaction holds locks on the order and store rows.
            try { await session.abortTransaction() } catch (e) { /* already aborted */ }
            try { session.endSession() } catch (e) { /* already ended */ }
        }
        return res.status(500).json({status: false, message: err.message || String(err)})
    }
}

exports.validate_payment = async(req,res)=>{
    try{

    const {transaction_id, tx_ref} = req.body
    if (!transaction_id || !tx_ref) {
        return res.status(400).json({status: false, message: "transaction_id and tx_ref are required"})
    }
    const user = req.session.user

    const order = await Order.findOne({tx_ref: tx_ref}).populate("shippingDetails")
    if (!order) {
        return res.status(404).json({status: false, message: "No order matches that tx_ref"})
    }

   const payload = {id: transaction_id}
    const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY , process.env.SECRET_KEY);
    const response = await flw.Transaction.verify(payload)

    // Flutterwave reports the *call* as status:"success" and the *transaction* as
    // data.status:"successful". This checked the top-level field, so even a paid order was
    // reported as a failure. The provider is the source of truth, and it has to agree with the
    // order: same tx_ref, and an amount that covers the total.
    const paid = response?.data?.status === "successful" || response?.status === "successful"
    if (!paid) {
        return res.status(403).json({status: false, message: response?.message || "Transaction was not successful"})
    }
    if (response.data?.tx_ref && response.data.tx_ref !== tx_ref) {
        return res.status(400).json({status: false, message: "This payment belongs to a different order"})
    }
    if (typeof response.data?.amount === "number" && response.data.amount + 0.001 < order.total_amount) {
        return res.status(400).json({status: false, message: "The amount paid is less than the order total"})
    }

        // Emptied only now that the money is confirmed — this used to run before the check, so
        // a failed verification still wiped the shopper's cart.
        const cart = await Cart.findOneAndUpdate({user: user}, {products: []})
       

        const update = await Order.findOneAndUpdate({tx_ref: tx_ref}, {$set:{status: "In Progress"}})
        const now = moment().utc()
        const formattedDate = now.format('YYYY-MM-DDTHH:mm:ss [GMT]ZZ');
  /*
        const options = {
            method: 'POST',
            url: 'https://api-mock.dhl.com/mydhlapi/shipments',
            headers: {
                'content-type': 'application/json',
                Authorization: 'Basic ZGVtby1rZXk6ZGVtby1zZWNyZXQ='
               },
            body:{
            "plannedShippingDateAndTime": formattedDate,
            "pickup": {
              "isRequested": false
            },
            "productCode": "P",
            "localProductCode": "P",
            "getRateEstimates": false,
            "accounts": [
              {
                "typeCode": "shipper",
                "number": "123456789"
              }
            ],
            "valueAddedServices": [
              {
                "serviceCode": "II",
                "value": 10,
                "currency": "USD"
              }
            ],
            "outputImageProperties": {
              "printerDPI": 300,
              "encodingFormat": "pdf",
              "imageOptions": [
                {
                  "typeCode": "invoice",
                  "templateName": "COMMERCIAL_INVOICE_P_10",
                  "isRequested": true,
                  "invoiceType": "commercial",
                  "languageCode": "eng",
                  "languageCountryCode": "US"
                },
                {
                  "typeCode": "waybillDoc",
                  "templateName": "ARCH_8x4",
                  "isRequested": true,
                  "hideAccountNumber": false,
                  "numberOfCopies": 1
                },
                {
                  "typeCode": "label",
                  "templateName": "ECOM26_84_001",
                  "renderDHLLogo": true,
                  "fitLabelsToA4": false
                }
              ],
              "splitTransportAndWaybillDocLabels": true,
              "allDocumentsInOneImage": false,
              "splitDocumentsByPages": false,
              "splitInvoiceAndReceipt": true,
              "receiptAndLabelsInOneImage": false
            },
            "customerDetails": {
              "shipperDetails": {
                "postalAddress": {
                  "postalCode": "526238",
                  "cityName": "Lagos",
                  "countryCode": "NG",
                  "addressLine1": "",
                  "addressLine2": "",
                  "addressLine3": "",
                  "countyName": "NG",
                  "countryName": "FEDERAL REPUBLIC OF NIGERIA"
                },
                "contactInformation": {
                  "email": "shipper_create_shipmentapi@dhltestmail.com",
                  "phone": "18211309039",
                  "mobilePhone": "18211309039",
                  "companyName": "Cider BookStore",
                  "fullName": "LiuWeiMing"
                },
                "registrationNumbers": [
                  {
                    "typeCode": "SDT",
                    "number": "CN123456789",
                    "issuerCountryCode": "CN"
                  }
                ],
                "bankDetails": [
                  {
                    "name": "Bank of China",
                    "settlementLocalCurrency": "RMB",
                    "settlementForeignCurrency": "USD"
                  }
                ],
                "typeCode": "business"
              },
              "receiverDetails": {
                "postalAddress": {
                  "cityName": order.shippingDetails.city,
                  "countryCode": order.shippingDetails.country_code,
                  "postalCode": order.shippingDetails.postal_code,
                  "addressLine1": "116 Marine Dr",
                  "countryName": order.shippingDetails.country
                },
                "contactInformation": {
                  "email": req.email,
                  "phone": req.phone,
                  "mobilePhone": req.phone,
                  "companyName": "",
                  "fullName": order.shippingDetails.recipient_name
                },
                "registrationNumbers": [
                  {
                    "typeCode": "SSN",
                    "number": "US123456789",
                    "issuerCountryCode": "US"
                  }
                ],
                "bankDetails": [
                  {
                    "name": "Bank of America",
                    "settlementLocalCurrency": "USD",
                    "settlementForeignCurrency": "USD"
                  }
                ],
                "typeCode": "business"
              }
            },
            "content": {
              "packages": [
                {
                  "typeCode": "2BP",
                  "weight": 0.5,
                  "dimensions": {
                    "length": 1,
                    "width": 1,
                    "height": 1
                  },
                  "customerReferences": [
                    {
                      "value": "3654673",
                      "typeCode": "CU"
                    }
                  ],
                  "description": "Piece content description",
                  "labelDescription": "bespoke label description"
                }
              ],
              "isCustomsDeclarable": true,
              "declaredValue": 120,
              "declaredValueCurrency": "USD",
              "exportDeclaration": {
                "lineItems": [
                  {
                    "number": 1,
                    "description": "Harry Steward biography first edition",
                    "price": 15,
                    "quantity": {
                      "value": 4,
                      "unitOfMeasurement": "GM"
                    },
                    "commodityCodes": [
                      {
                        "typeCode": "outbound",
                        "value": "84713000"
                      },
                      {
                        "typeCode": "inbound",
                        "value": "5109101110"
                      }
                    ],
                    "exportReasonType": "permanent",
                    "manufacturerCountry": "US",
                    "exportControlClassificationNumber": "US123456789",
                    "weight": {
                      "netValue": 0.1,
                      "grossValue": 0.7
                    },
                    "isTaxesPaid": true,
                    "additionalInformation": [
                      "450pages"
                    ],
                    "customerReferences": [
                      {
                        "typeCode": "AFE",
                        "value": "1299210"
                      }
                    ],
                    "customsDocuments": [
                      {
                        "typeCode": "COO",
                        "value": "MyDHLAPI - LN#1-CUSDOC-001"
                      }
                    ]
                  },
                  {
                    "number": 2,
                    "description": "Andromeda Chapter 394 - Revenge of Brook",
                    "price": 15,
                    "quantity": {
                      "value": 4,
                      "unitOfMeasurement": "GM"
                    },
                    "commodityCodes": [
                      {
                        "typeCode": "outbound",
                        "value": "6109100011"
                      },
                      {
                        "typeCode": "inbound",
                        "value": "5109101111"
                      }
                    ],
                    "exportReasonType": "permanent",
                    "manufacturerCountry": "US",
                    "exportControlClassificationNumber": "US123456789",
                    "weight": {
                      "netValue": 0.1,
                      "grossValue": 0.7
                    },
                    "isTaxesPaid": true,
                    "additionalInformation": [
                      "36pages"
                    ],
                    "customerReferences": [
                      {
                        "typeCode": "AFE",
                        "value": "1299211"
                      }
                    ],
                    "customsDocuments": [
                      {
                        "typeCode": "COO",
                        "value": "MyDHLAPI - LN#1-CUSDOC-001"
                      }
                    ]
                  }
                ],
                "invoice": {
                  "number": "2667168671",
                  "date": "2022-10-22",
                  "instructions": [
                    "Handle with care"
                  ],
                  "totalNetWeight": 0.4,
                  "totalGrossWeight": 0.5,
                  "customerReferences": [
                    {
                      "typeCode": "UCN",
                      "value": "UCN-783974937"
                    },
                    {
                      "typeCode": "CN",
                      "value": "CUN-76498376498"
                    },
                    {
                      "typeCode": "RMA",
                      "value": "MyDHLAPI-TESTREF-001"
                    }
                  ],
                  "termsOfPayment": "100 days",
                  "indicativeCustomsValues": {
                    "importCustomsDutyValue": 150.57,
                    "importTaxesValue": 49.43
                  }
                },
                "remarks": [
                  {
                    "value": "Right side up only"
                  }
                ],
                "additionalCharges": [
                  {
                    "value": 10,
                    "caption": "fee",
                    "typeCode": "freight"
                  },
                  {
                    "value": 20,
                    "caption": "freight charges",
                    "typeCode": "other"
                  },
                  {
                    "value": 10,
                    "caption": "ins charges",
                    "typeCode": "insurance"
                  },
                  {
                    "value": 7,
                    "caption": "rev charges",
                    "typeCode": "reverse_charge"
                  }
                ],
                "destinationPortName": "New York Port",
                "placeOfIncoterm": "ShenZhen Port",
                "payerVATNumber": "12345ED",
                "recipientReference": "01291344",
                "exporter": {
                  "id": "121233",
                  "code": "S"
                },
                "packageMarks": "Fragile glass bottle",
                "declarationNotes": [
                  {
                    "value": "up to three declaration notes"
                  }
                ],
                "exportReference": "export reference",
                "exportReason": "export reason",
                "exportReasonType": "permanent",
                "licenses": [
                  {
                    "typeCode": "export",
                    "value": "123127233"
                  }
                ],
                "shipmentType": "personal",
                "customsDocuments": [
                  {
                    "typeCode": "INV",
                    "value": "MyDHLAPI - CUSDOC-001"
                  }
                ]
              },
              "description": "Shipment",
              "USFilingTypeValue": "12345",
              "incoterm": "DAP",
              "unitOfMeasurement": "metric"
            },
            "shipmentNotification": [
              {
                "typeCode": "email",
                "receiverId": "shipmentnotification@mydhlapisample.com",
                "languageCode": "eng",
                "languageCountryCode": "UK",
                "bespokeMessage": "message to be included in the notification"
              }
            ],
            "getTransliteratedResponse": false,
            "estimatedDeliveryDate": {
              "isRequested": true,
              "typeCode": "QDDC"
            },
            "getAdditionalInformation": [
              {
                "typeCode": "pickupDetails",
                "isRequested": true
              }
            ]
           },

           json: true
           

         
          }
          const shipment = await create_shipment(options)
         // const data = JSON.parse(shipment)
          console.log(shipment)
        */

        return res.status(200).json({
            status: true,
            message: "Payment confirmed",
            data: {
                order_id: update.order_id,
                status: update.status,
                amount: update.total_amount,
                tx_ref: update.tx_ref
            }
        })

}
catch(err){
    return res.status(500).json({status:false, message: err.message || String(err)})
}
}
exports.update_order_status = async(req, res)=>{
    const {order_id, status} = req.body
    const order = await Order.findOneAndUpdate({order_id: order_id},{status: status})

    return res.status(200).json({statujs: true, message: "Update Successful"})
}

exports.change_location = async(req,res)=>{
    const {location}= req.body
    const user = req.session.user
    await User.findOneAndUpdate({_id: user}, {location: location})
    return res.status(200).json({status: true, message: "Location changed successfuly"})

    
}

exports.fetch_store_order = async(req,res)=>{
    try{
    const {store_id} = req.params
    const store = await Store.findById(store_id)

    const orders = await Order.find({_id: {$in: store.orders}}).populate('products.product', "name price") 

    console

    return res.status(200).json({status: true, message:"Fetched", data: orders})
    }
    catch(err){
        res.status(500).json({status: false, data: err})
    }
}

//exports.
exports.fectch_user_orders = async(req,res)=>{

    try{
    const user_id = req.session.user 

    const orders = await Order.find({user: user_id}).populate("shippingDetails").populate({path: 'products.product', select: 'name price currency'})

    res.status(200).json({status: true, message: "Retrieved Successfully", data : orders})

    }
    catch(err){
        res.status(500).json({status: false, message: err})
    }

}
