const express = require("express");
const router = express.Router();
const nocache = require('nocache')

const adminController=require("../Controller/adminController")
const productController = require('../Controller/productController');
const categoryController = require('../Controller/categoryController');
const {storage, upload} = require('../middleware/multer');
const Order = require('../Controller/admin-orderManagement-controller')
const coupons = require('../Controller/couponController')


let admiN;

router.get('/order-management',isAdmin,Order.OrderManagementPageGet);
router.delete('/order-management/deleteOrder/:orderId',isAdmin,Order.OrderDelete)
router.get('/order-management/orderDetailedView/:orderId',isAdmin,Order.orderDetailedView);
router.post('/order-management/update-order-status/:orderId',isAdmin,Order.updateOrderStatus)
router.post('/refund-amount',isAdmin,Order.refundAmount)



router.get("/login", adminController.adminlogin)

router.post("/login", adminController.adminpost) 

router.get("/", isAdmin, adminController.adminhome)

router.get("/logout", isAdmin, adminController.adminlogout)

router.get("/usermanagement",isAdmin,adminController.adminusers)
router.get('/user-search',isAdmin,adminController.usersearch)

router.post("/blockUser",isAdmin,adminController.blockuser)




//admin product management
router.get('/product-management',isAdmin,productController.productManagementGet)
router.post('/product-management/newProduct',isAdmin,upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images' }]),productController.productManagementCreate)
router.get('/product-management/getCategories',isAdmin,productController.productCategories);
router.post('/product-management/editProduct/:Id',isAdmin,upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images' }]),productController.productManagementEdit);
router.delete('/product-management/delete-product/:productId',isAdmin,productController.productManagementDelete);
router.post('/product-management/featuredProduct',isAdmin,productController.productManagementPublish);
router.get('/product-management/removeimg',isAdmin,productController.removeProductImg)
router.get('/product-search',isAdmin,productController.productSearch)

//category
router.get('/category-management',categoryController.categoryManagementGet);
router.post('/category-management/newCategory',isAdmin, upload.single('image'),categoryController.categoryManagementCreate)
router.post('/category-management/edit-category/:categoryId',isAdmin,upload.single('editImage'),categoryController.categoryManagementEdit)
// router.delete('/category-management/delete-category/:categoryId',category.categoryManagementDelete);
router.post('/category-management/isFeatured',isAdmin,categoryController.categoryManagementFeatured)



router.get('/coupon-management',isAdmin,coupons.couponManagementGet);
router.post('/createCoupon',isAdmin,coupons.couponCreate);
router.post('/coupon/update-status/:Id',isAdmin,coupons.couponUpdate);
router.post('/EditCoupon/:Id',isAdmin,coupons.couponEdit)




router.get('/admin/login',adminController.logout)

function isAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.render('adminLogin');
  
  }
}

function checkUserSession(req, res, next) {
  if (req.session && req.session.user) {
    res.locals.isUserActive = true;
  } else {
    res.locals.isUserActive = false;
  }
  next();
}

// Apply the checkUserSession middleware to all admin routes
router.use(checkUserSession);




module.exports = router;

