const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({

    host: "smtp.gmail.com",

    port: 587,

    secure: false,

    auth: {

        user: "lic.elango@gmail.com",

        pass: "ddyuhuzpzu coupzv".replace(/\s/g,'')

    },

    tls: {

        rejectUnauthorized: false

    }

});


transporter.verify()
.then(()=>{

console.log("GMAIL LOGIN SUCCESS");

})
.catch(err=>{

console.log("GMAIL ERROR");
console.log(err);

});