const axios = require('axios');

const sendWhatsappMessage = async ({
    endpoint,
    token,
    customerNumber,
    customerName,
    message,
    templateName
}) => {

    console.log(
        "WHATSAPP SERVICE INPUT:",
        {
            endpoint,
            customerNumber,
            customerName,
            templateName,
            messageLength: message?.length
        }
    );

    try {

        const url =
            `${endpoint}/api/v1/sendTemplateMessage?whatsappNumber=${customerNumber}`;

        const cleanName = String(
            customerName || 'Customer'
        ).trim();

        const cleanMessage = String(message || '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/https?:\/\/\S+/g, '')
            .replace(/\n/g, ' ')
            .replace(/\t/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        console.log("CLEAN NAME:", cleanName);
        console.log("CLEAN MESSAGE:", cleanMessage);

        const response = await axios.post(
            url,
            {
                template_name: templateName,
                broadcast_name: templateName,

                parameters: [
                    {
                        name: "1",
                        value: cleanName
                    },
                    {
                        name: "2",
                        value: cleanMessage
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log(
            "WATI LOCAL MESSAGE ID:",
            response.data.local_message_id
        );

        console.log(
            "WATI RESPONSE:",
            JSON.stringify(
                response.data,
                null,
                2
            )
        );

        return response.data;

    } catch (error) {

        console.log(
            "WATI ERROR STATUS:",
            error.response?.status
        );

        console.log(
            "WATI ERROR DATA:",
            JSON.stringify(
                error.response?.data,
                null,
                2
            )
        );

        console.log(
            "WATI ERROR MESSAGE:",
            error.message
        );

        throw error;
    }
};

module.exports = {
    sendWhatsappMessage
};