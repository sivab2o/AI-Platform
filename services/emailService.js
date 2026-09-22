const nodemailer = require('nodemailer');

const sendInfoEmail = async ({
    businessEmail,
    appPassword,
    customerEmail,
    customerName,
    subject,
    content,
    attachments = []
}) => {

    try {

        const transporter =
            nodemailer.createTransport({
                host: 'smtp.gmail.com',
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

        const safeContent =
            String(content || '')
                .replace(/\n/g, '<br>');

        await transporter.sendMail({
            from: businessEmail,
            to: customerEmail,
            subject: subject,

            html: `
                <h3>Hello ${customerName || 'Customer'},</h3>
                <p>${safeContent}</p>
                <br>
                <p>Thank you.</p>
            `,

            attachments
        });

        console.log(
            'Email sent successfully:',
            customerEmail
        );

        return true;

    } catch (error) {

        console.error(
            'Email Error:',
            error.message
        );

        throw error;
    }
};

module.exports = {
    sendInfoEmail
};