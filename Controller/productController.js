const {productModel} = require("../models/product");
const CategoryModel = require("../models/category");



const getproductManagement=async (req, res) => {
  try {
      let query = {};

      // Check if a category is selected for filtering
      const selectedCategory = req.query.category || ''; // Default to empty string if not provided
      if (selectedCategory) {
          query.category = selectedCategory;
      }

      const products = await productModel.find(query)
          .populate('category') // Populate the 'category' field
          .lean();

      const categories = await CategoryModel.find().lean();
      
      res.render('products', { products,categories,selectedCategory, pagetitle: 'Products' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};


const productManagementCreate = async (req, res) => {
  try {
      
      // Extract product details from the request body
      console.log(req.body);
      console.log(req.files );
      const product = new productModel({
          // owner: admin._id, // Adjust this based on how you handle user authentication
          productName: req.body.productName,
          description: req.body.description,
          image: req.files['image'][0].path.replace(/\\/g, '/').replace('public/',''), // Assuming 'image' is the name attribute of the main image input
          images: req.files['images'].map(file => file.path.replace(/\\/g, '/')), // Assuming 'images' is the name attribute of the additional images input
          // images: req.files['images'].map(file => file.path.replace(/\\/g, '/')), // Assuming 'images' is the name attribute of the additional images input
          brand: req.body.brand,
          countInStock: req.body.countInStock,
          category: req.body.category, // You may need to convert this to a MongoDB ObjectId
          price: req.body.price,
          rating: req.body.rating
      });

     
      // Process the main image
    
      // Save the new product to the database
       product.save().then(async (product) => {
          // Associate the product with its category
          const category = await CategoryModel.findById(product.category);
          if (category) {
              category.products.push(product._id);
              await category.save();
          }
          console.log('Product saved successfully.');
      })
      .catch((error) => {
          console.error('Error saving product:', error);
      });;

      return res.status(201).redirect('/admin/product-management');
  } catch (error) {
      console.error('Error adding product: ' + error);
      return res.status(500).send({ error: 'Internal Server Error', errorMessage: error.message });
  }
};

const productCategories=async (req, res) => {
  try {
      const categories = await CategoryModel.find({}, 'name'); // Only fetch category names
      res.status(200).json(categories);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
}

const productManagementEdit = async (req, res) => {
  try {
      // Check if the product with the specified ID exists in the database
      const productId = req.params.Id;
      const existingProduct = await productModel.findById(productId);
      if (!existingProduct) {
          return res.status(404).json({ error: 'Product not found' });
      }

      // Extract product details from the request body
      const {
          productName,
          description,
          brand,
          countInStock,
          category,
          price,
          rating
      } = req.body;

      // Initialize image and images variables
      let image = existingProduct.image;
      let images = existingProduct.images;

      // Check if files are provided in the request
      if (req.files) {
          // Process the main image
          if (req.files['image']) {
              image = req.files['image'][0].path.replace(/\\/g, '/').replace('public/','')
          }

          // Process additional images (if any)
          if (req.files['images']) {
              images = req.files['images'].map((file) =>
                  file.path.replace(/\\/g, '/').replace('public/','')
              );
          }
      }

      // Update the product in the database
      const updatedProduct = await productModel.findByIdAndUpdate(
          productId,
          {
              productName,
              description,
              brand,
              countInStock,
              category,
              price,
              image,
              images,
              rating
          },
          {
              new: true,
          }
      );
      const updatedCategory = await CategoryModel.findById(updatedProduct.category);
      if (updatedCategory) {
          updatedCategory.products.push(updatedProduct._id);
          await updatedCategory.save();
      }
      if (!updatedProduct) {
          return res.status(404).json({ message: 'Product not found' });
      }
      

      res.status(200).redirect('/admin/product-management');
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error', errorMessage: error.message });
  }
};

const productManagementDelete =  async (req, res) => {
  const { productId } = req.params;

  try {
      // Find the product by ID and delete it
      const deletedProduct = await productModel.findOneAndDelete({ _id: productId });

      if (!deletedProduct) {
          return res.status(404).json({ error: 'Product not found' });
      }

      res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};


const productManagementPublish =  async (req, res) => {
  try {
      let {id} = req.body
      let productDetails = await productModel.findById(id)
      if(productDetails.isFeatured){
          productDetails.isFeatured = false
          await productDetails.save()
          res.status(200).json({status: true})
      } else if(!productDetails.isFeatured){
          productDetails.isFeatured = true
          await productDetails.save()
          res.status(201).json({status: true})
      }

  } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports={
  getproductManagement,
  productManagementCreate,
  productCategories,
  productManagementEdit,
  productManagementDelete,
  productManagementPublish
}