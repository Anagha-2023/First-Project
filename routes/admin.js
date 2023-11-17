const express = require("express");
const router = express.Router();
const nocache = require('nocache')

const adminController=require("../Controller/adminController")
const productController = require('../Controller/productController');
const categoryController = require('../Controller/categoryController');
const {storage, upload} = require('../middleware/multer');

let admiN;


router.get("/login", adminController.adminlogin)

router.post("/login", adminController.adminpost) 

router.get("/", isAdmin, adminController.adminhome)

router.get("/logout", isAdmin, adminController.adminlogout)

router.get("/usermanagement",adminController.adminusers)

router.post("/blockUser",adminController.blockuser)

//product
router.get("/product-management",productController.getproductManagement)
router.post('/product-management/newProduct',upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images' }]),productController.productManagementCreate)
router.get('/product-management/getCategories',productController.productCategories);
router.post('/product-management/editProduct/:Id',upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images' }]),productController.productManagementEdit);
router.delete('/product-management/delete-product/:productId',productController.productManagementDelete);
router.post('/product-management/featuredProduct',productController.productManagementPublish);

//category
router.get('/category-management',categoryController.categoryManagementGet);
router.post('/category-management/newCategory', upload.single('image'),categoryController.categoryManagementCreate)
router.post('/category-management/edit-category/:categoryId',upload.single('editImage'),categoryController.categoryManagementEdit)
// router.delete('/category-management/delete-category/:categoryId',category.categoryManagementDelete);
router.post('/category-management/isFeatured',categoryController.categoryManagementFeatured)


// router.delete("/users/delete/:id", isAdmin, adminController.userdelete)

// router.get("/users/add", isAdmin, adminController.useradd)

// router.post("/users/add", isAdmin, adminController.useraddpost)

// router.get("/users/edit/:userId", isAdmin, adminController.userupdate)

// router.post("/users/edit/:userId", isAdmin, adminController.updatepost)

// router.post("/users/search", isAdmin, adminController.usersearch)



function isAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.status(403).render('FORBIDDEN');
  
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

