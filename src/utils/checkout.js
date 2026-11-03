const { default: mongoose } = require("mongoose")
const { Cart } = require("../models/cart")
const shortid = require('shortid');

const request = require('request');
/*
exports.getCartTotalPrice = async(cartId) =>{

    
        const result = await Cart.aggregate([
            { $match: {_id : mongoose.Types.ObjectId(cartId)}},
            {$unwind: '$products'},
            {
             $lookup:{
                from: 'products',
                localField: 'products.product',
                foreignField: '_id',
                as: 'productDetails'
             } 
            },
            {
                $unwind: '$productDetails'
            },
            { 
                $addFields: {
                  convertedPrice: { $toDouble: '$productDetails.price' }
                }
              },
            
            {
                $project:{
                    quantity: '$products.quantity',
                    price: {$toDouble: '$productDetails.price'}
                }

            },
            {
                $project:{
                    total:{
                        $multiply:['$products.quantity', '$productDetails.price']
                    }
                }
            },
            {
                $group:{
                    _id: '$_id',
                    total:{$sum: '$total'}
                }
            }
        ])
       
        if(result.length > 0){
            console.log('Product Details:', result[0].productDetails);
            
            
            console.log(result)
            return result[0].total;
        }else{
            return 0
        }
    
} 
*/
exports.calculateCartTotal=  async (cartId)=> {
    try {
   
      const cart = await Cart.findById(cartId)
        .populate('products.product', 'price'); 
  
      if (!cart) {
        return  'Cart not found' ;
      }
  
      const totalPrice = cart.products.reduce((acc, product) => {
        const productPrice = product.product ? product.product.price : 0;
        return acc + (productPrice * product.quantity);
      }, 0);
  
      return  totalPrice;
    } catch (error) {
     
      return  error ;
    }
  }


  exports.generateorderId = ()=>{

    return `ORD-${shortid.generate()}`
}

exports.generateproductId = ()=>{

    return `PROD-${shortid.generate()}`
}

exports.generateTxRef = ()=>{

    return `tx-${shortid.generate()}`
}

exports.calculate_shipping_fee = (options) =>{
  return new Promise((resolve, reject) => {
      request (options, (error, response, body) => {
          if (error) {
              return reject(error);
          }
          resolve(body);
      });
  });
}

// A shipping quote that is allowed to fail.
//
// checkout used to call calculate_shipping_fee with these same options and no try/catch, and
// the endpoint it points at is dead: api-mock.dhl.com answers with a certificate for
// apigee.net, so the request dies with a TLS error in ~300ms. Unbounded and unguarded, that
// rejection was the end of every checkout — Express never wrote a response and no order was
// ever created. The quote is therefore bounded (8s) and optional: if the shipping service
// cannot be reached the caller is told shipping_quoted:false and charges no fee, instead of
// inventing one. TLS verification stays on; this is an external party.
exports.quote_shipping_fee = async () => {
    const options = {
        method: 'GET',
        url: 'https://api-mock.dhl.com/mydhlapi/rates',
        timeout: 8000,
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
            plannedShippingDate: new Date().toISOString().slice(0, 10),
            isCustomsDeclarable: "false",
            unitOfMeasurement: 'metric'
        },
        headers: {
            Authorization: 'Basic ZGVtby1rZXk6ZGVtby1zZWNyZXQ='
        }
    };

    try {
        const body = await exports.calculate_shipping_fee(options);
        const json = JSON.parse(body);
        const fee = json?.products?.[0]?.totalPrice?.[0]?.price;
        if (typeof fee !== 'number' || Number.isNaN(fee)) {
            return { shipping_fee: 0, shipping_quoted: false };
        }
        return { shipping_fee: fee, shipping_quoted: true };
    } catch (error) {
        return { shipping_fee: 0, shipping_quoted: false };
    }
};

exports.create_shipment = (options)=>{
  return new Promise((resolve, reject) => {
    request (options, (error, response, body) => {
        if (error) {
            return reject(error);
        }
        resolve(body);
    });
});
  

}