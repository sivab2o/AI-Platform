const nodemailer = require('nodemailer');


const sendInfoEmail = async ({
    businessEmail,
    appPassword,
    customerEmail,
    customerName,
    subject,
    content
}) => {

    try {

        const transporter = nodemailer.createTransport({

            host: "smtp.gmail.com",

            port: 587,

            secure: false,

            auth: {

                user: businessEmail,

                pass: appPassword

            },

            tls: {

                rejectUnauthorized: false

            }

        });


        await transporter.sendMail({

            from: businessEmail,

            to: customerEmail,

            subject: subject,

            html: `
                <h3>Hello ${customerName || 'Customer'},</h3>

                <p>${content.replace(/\n/g, '<br>')}</p>

                <br>

                <p>Thank you.</p>
            `

        });


        console.log(
            "Email sent successfully:",
            customerEmail
        );


        return true;


    }
    catch (error) {

        console.log(
            "Email Error:",
            error.message
        );

        throw error;

    }

};


module.exports = {
    sendInfoEmail
};