const express = require("express");
const router = express.Router();
const session = require("express-session");
const adminModel = require("../models/Admin");
const admin = require("../routes/admin")
const UserModel = require("../models/User");
const mongoose = require("mongoose");
const nocache = require('nocache')
const { productModel } = require("../models/product");
const orderModel = require('../models/orderSchema')
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');


let admiN;


async function salesReport(date) {
  try {
      const currentDate = new Date();
      let orders = [];

      for (let i = 0; i < date; i++) {
          const startDate = new Date(currentDate);
          startDate.setDate(currentDate.getDate() - i);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(currentDate);
          endDate.setDate(currentDate.getDate() - i);
          endDate.setHours(23, 59, 59, 999);

          const dailyOrders = await orderModel.find({
              status: "Delivered",
              orderDate: {
                  $gte: startDate,
                  $lt: endDate,
              },
          }).catch(error => {
              console.error("Error fetching daily orders:", error);
              throw error;
          });

          orders = [...orders, ...dailyOrders];
      }

      const users = await UserModel.countDocuments().catch(error => {
          console.error("Error fetching user count:", error);
          throw error;
      });

      let totalRevenue = 0;
      orders.forEach((order) => {
          totalRevenue += order.billTotal;
      });

      const totalOrderCount = await orderModel.find({
          status: "Delivered",
      }).catch(error => {
          console.error("Error fetching total order count:", error);
          throw error;
      });

      let Revenue = 0;
      totalOrderCount.forEach((order) => {
          Revenue += order.billTotal;
      });

      const stock = await productModel.find().catch(error => {
          console.error("Error fetching product stock:", error);
          throw error;
      });

      let totalCountInStock = 0;
      stock.forEach((product) => {
          totalCountInStock += product.countInStock;
      });

      const averageSales = orders.length / date;
      const averageRevenue = totalRevenue / date;

      return {
          users,
          totalOrders: orders.length,
          totalRevenue,
          totalOrderCount: totalOrderCount.length,
          totalCountInStock,
          averageSales,
          averageRevenue,
          Revenue,
      };
  } catch (error) {
      console.error("Error in salesReport function:", error);
      throw error;
  }
}


const downloadPdf = async (req, res) => {
  try {
    // Obtain the sales data for the desired period (e.g., daily)
    let salesData = null; // Change the parameter based on the desired period

    if (req.query.type === 'daily') {
      salesData = await salesReport(1);
    } else if (req.query.type === 'weekly') {
      salesData = await salesReport(7);
    } else if (req.query.type === 'monthly') {
      salesData = await salesReport(30);
    } else if (req.query.type === 'yearly') {
      salesData = await salesReport(365);
    }

    let doc = new PDFDocument();

    // Set response headers for the PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');

    // Pipe the PDF content to the response
    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(20).text('Sales Report', { align: 'center' });

    // Insert sales data into the PDF
    if (salesData) {
      doc.fontSize(12).text(`Total Revenue: INR ${salesData.totalRevenue}`);
      doc.text(`Total Orders: ${salesData.totalOrders}`);
      doc.text(`Total Order Count: ${salesData.totalOrderCount}`);
      doc.text(`Total Count In Stock: ${salesData.totalCountInStock}`);
      doc.text(`Average Sales: ${salesData.averageSales ? salesData.averageSales.toFixed(2) : 'N/A'}%`);
      doc.text(`Average Revenue: ${salesData.averageRevenue ? salesData.averageRevenue.toFixed(2) : 'N/A'}%`);
    } else {
      doc.text('No sales data available.');
    }

    // End the document and send it to the client
    doc.end();
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Error generating PDF.');
  }
};


const generateExcel = async (req, res, next) => {
  try {
    const salesDatas = await salesReport(0);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
      { header: 'Total Revenue', key: 'totalRevenue', width: 15 },
      { header: 'Total Orders', key: 'totalOrders', width: 15 },
      { header: 'Total Count In Stock', key: 'totalCountInStock', width: 15 },
      { header: 'Average Sales', key: 'averageSales', width: 15 },
      { header: 'Average Revenue', key: 'averageRevenue', width: 15 },
      { header: 'Revenue', key: 'Revenue', width: 15 },
    ];

    worksheet.addRow({
      totalRevenue: salesDatas.totalRevenue,
      totalOrders: salesDatas.totalOrders,
      totalCountInStock: salesDatas.totalCountInStock,
      averageSales: salesDatas.averageSales ? salesDatas.averageSales.toFixed(2) : 'N/A',
      averageRevenue: salesDatas.averageRevenue ? salesDatas.averageRevenue.toFixed(2) : 'N/A',
      Revenue: salesDatas.Revenue,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');

    workbook.xlsx.write(res).then(() => res.end());
  } catch (error) {
    console.log(error);
    return res.status(500).send('Error generating Excel file.');
  }
};

const adminlogin = (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect("/admin");
  } else {
    res.render("adminLogin");
  }
};

const adminpost = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log(adminModel);

    const admin = await adminModel.findOne({ email, password });

    console.log(admin);

    if (admin) {
      admiN = admin.name;
      req.session.isAdmin = true;
      console.log(admiN);
      res.status(200);
      res.redirect("/admin");
    } else {
      res.render("adminLogin", {
        errorMessage: "Invalid admin credentials",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

let adminhome = async (req, res) => {
  if (req.session.isAdmin) {
    req.session.isAdmin = true;
    
    let product = await productModel.find()
    let orders = await orderModel.find().sort({ createdAt: -1 }).limit(10).populate('user', 'name');
    
    const salesReportData = await fetchSalesReport();

      const daily = await salesReport(1); // Assuming you want daily data
      const weekly = await salesReport(7);
      const monthly = await salesReport(30);
      const yearly = await salesReport(365);

    let fullSalesData = await salesReport(365); // Assuming you want data for the past 365 days

    // Extract data from the full sales report
    let totalOrders = monthly.totalOrders;
    let averageSales = monthly.averageSales;
    let averageRevenue = monthly.averageRevenue;

    console.log(monthly.totalOrders, "////////////////////////////");
    console.log(monthly.Revenue, "////////////////////////////");
    console.log("Full Sales Data:", fullSalesData);
    let allProductsCount = await productModel.countDocuments();

    res.render("adminHome", { daily, weekly, monthly, yearly, fullSalesData, orders, product, allProductsCount, totalOrders, averageSales, averageRevenue, salesReportData});
  } else {
    res.redirect("/admin/login");
  }
};

const fetchSalesReport = async () => {
  try {
    // Fetch all orders with status "Delivered"
    const orders = await orderModel.find({ status: "Delivered" }).populate('user', 'name');

    // Prepare the sales report data
    const salesReportData = orders.map(async order => {
      return order.items.map(async item => {
        const product = await productModel.findById(item.productId);
        if (order.user) { // Check if order.user exists
          return {
            productName: product.productName,
            totalStock: product.countInStock,
            remainingStock: product.countInStock - item.quantity,
            customerName: order.user.name,
            totalRevenue: order.billTotal
          };
        } else {
          return null; // Return null if order.user does not exist
        }
      });
    });

    // Flatten the array of arrays and await all promises
    return (await Promise.all(salesReportData.flat())).filter(Boolean); // Remove any undefined values
  } catch (error) {
    console.error("Error fetching sales report:", error);
    throw error;
  }
};





const adminusers = async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Get the requested page from query parameters
  const limit = 5; // Number of users per page

  try {
    const totalUsers = await UserModel.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    const users = await UserModel.find()
      .skip((page - 1) * limit)
      .limit(limit);

    res.render("usersList", {
      users,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Internal Server Error");
  }
};


const blockuser = async (req, res) => {
  try {
    const { id } = req.body;
    const user = await UserModel.findById(id);

    if (user) {
      // Toggle the block status
      user.isBlocked = !user.isBlocked;
      await user.save();

      // Update the block status in the session if the user is logged in
      if (req.session && req.session.user) {
        req.session.user.isBlocked = user.isBlocked;
      }

      res.status(200).json({
        status: true,
        isBlocked: user.isBlocked,
      });
    } else {
      res.status(404).json({
        status: false,
        message: 'User not found',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
    });
  }
};


const userdelete = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await UserModel.findByIdAndDelete(userId);

    if (!user) {
      res.status(404).send("User not found");
    } else {
      req.session.user = false;
      res.send("User deleted successfully");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while deleting the user");
  }
};

const useradd = (req, res) => {
  res.render("adminAdduser");
};

const adminlogout = (req, res) => {
  console.log("hello logout ");

  req.session.isAdmin = false;
  res.render('adminLogin')

};

const useraddpost = (req, res) => {
  const { username, email, password } = req.body;

  // Check if the user already exists in the database
  UserModel.findOne({ email: email })
    .then((foundUser) => {
      if (foundUser) {
        res.render("adminAdduser", {
          errorMessage: "User already exists. Please See in your list.",
        });
      } else {
        const newUser = new UserModel({
          name: username,
          email: email,
          password: password,
        });

        newUser
          .save()
          .then(() => {
            res.send(
              '<script> window.location.href = "/admin/users"; alert("New User added successfully."); </script>'
            );
            return;
          })
          .catch((err) => {
            console.error(err);
            res.send(
              '<script>alert("Error occurred while registering the user."); window.location.href = "/users";</script>'
            );

          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.send(
        '<script>alert("Error occurred while checking user existence."); window.location.href = "/signup";</script>'
      );
    });
};

const userupdate = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Render the EJS template for editing user details
    res.render("adminEdituser", { user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updatepost = async (req, res) => {
  try {
    const userId = req.params.userId;

    const updatedUserDetails = req.body;
    console.log("herer updated");

    const user = await UserModel.findByIdAndUpdate(userId, updatedUserDetails, {
      new: true,
    });
    if (!user) {
      res.send(
        '<script> window.location.href = "/admin/users"; alert("User is Not Found or something error occurs."); </script>'
      );
      return;
    }

    res.send(
      '<script> window.location.href = "/admin/users"; alert("User Details are updated successfully."); </script>'
    );
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const usersearch = async (req, res) => {
  try {
    const { search } = req.query; // Assuming the user name is in the query string

    if (!search || typeof search !== 'string') {
      return res.status(400).json({ message: "Invalid user name" });
    }

    const page = parseInt(req.query.page) || 1; // Get the requested page from query parameters
    const limit = 5; // Number of users per page

    const regex = new RegExp(search, 'i'); // Case-insensitive substring search in the name

    const totalUsers = await UserModel.countDocuments({ name: regex });
    const totalPages = Math.ceil(totalUsers / limit);

    const users = await UserModel.find({ name: regex })
      .skip((page - 1) * limit)
      .limit(limit);

    res.render("usersList", {
      users,
      currentPage: page,
      totalPages,
      search,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};







const logout = (req, res) => {
  res.render('adminLogin')
}

module.exports = {
  adminlogin,
  adminpost,
  generateExcel,
  adminhome,
  adminlogout,
  adminusers,
  userdelete,
  useradd,
  downloadPdf,
  useraddpost,
  userupdate,
  updatepost,
  usersearch,
  blockuser,
  logout,
}