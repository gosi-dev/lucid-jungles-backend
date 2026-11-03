
const router = require('express').Router();

const controller = require('../controllers/store');
const { loginRequired, destroySession } = require('../middlewares/auth');


router.post("/create", loginRequired, controller.create_store )
router.get("/fetch_all_store", loginRequired, controller.fectch_all_store)
// Fixed paths before parameterised ones. "/public/products" used to be declared at
// the bottom of this file, below "/:store_id/products", so Express matched it as
// store_id="public" and ran loginRequired — the public catalogue answered 401 and the
// store grid was empty for everyone, signed in or not.
router.get("/public/products", controller.fetch_all_products_public)
router.post("/:storeId/add_product", loginRequired, controller.add_product_to_store)
router.post("/add_to_cart", loginRequired, controller.add_item_to_cart)
router.delete("/:productId/remove_from_cart", loginRequired, controller.delete_item_from_cart)
router.get("/fetch_user_cart", loginRequired, controller.fecth_user_cart )
router.get("/:store_id/products", loginRequired, controller.fetch_all_products)
router.post("/add_to_favourites",loginRequired, controller.add_to_favourites)
router.get("/fetch_favourites", loginRequired,controller.fecth_favourites)
router.delete("/:productId/favourites", loginRequired, controller.remove_from_favourites)
router.get("/orders", loginRequired, controller.fectch_user_orders)
router.post("/create_shipping_address", loginRequired, controller.create_Shipping_Address)
router.get("/fetch_shipping_address", loginRequired, controller.fetch_user_address)
router.put("/update_address", loginRequired, controller.edit_address)
router.post("/change_location", loginRequired, controller.change_location)
router.post("/validate_payment", loginRequired, controller.validate_payment)
router.post("/update_order_status", loginRequired, controller.update_order_status)
router.post("/checkout", loginRequired, controller.checkout)
router.get("/:store_id/fetch_orders", loginRequired, controller.fetch_store_order)
router.put("/edit_cart/:cartId", loginRequired,controller.edit_cart)
router.get("/product/:productId",  controller.fetch_product)
//router.post("/")

exports.storeRouter = router;