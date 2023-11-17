const nodemailer = require('nodemailer');
const randomsring = require("randomstring");

const transporter = nodemailer.createTransport({
    service:"Gmail",
    auth:{
        user:"anaghakb55@gmail.com",
        pass:"ckbx hztv jusc ujre"
    }
})

async function sentOtp(email){
    const otp = randomsring.generate({
        length : 6,
        charset:'numeric',
    })
 
    const mailOptions = {
        from : 'anaghakb55@gmail.com',
        to :email,
        subject : 'Yor otp code for verification',
        text:  ` Your OTP verification code is : ${otp}`,
    };

    transporter.sendMail(mailOptions,(error,info)=>{
        if(error){
            console.error("Error sending email : " + error) 
        }else{
            console.log("Email send : ", info.response );
            console.log('OTP : ',otp);
        }
    });
    
    return otp;
}

module.exports = { sentOtp };