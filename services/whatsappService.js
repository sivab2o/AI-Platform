const axios = require('axios');

const sendWhatsappMessage = async ({
    endpoint,
    token,
    customerNumber,
    customerName,
    message,
    templateName,
    fileTemplateName =
        process.env.WATI_FILE_TEMPLATE_NAME ||
        'ai_file_share',
    attachments = []
}) => {

    const cleanEndpoint =
        String(endpoint || '')
            .replace(/\/+$/, '');

    const cleanNumber =
        String(customerNumber || '')
            .replace(/\D/g, '');

    const cleanName =
        String(customerName || 'Customer')
            .trim();

    const cleanMessage =
        String(message || '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/\n/g, ' ')
            .replace(/\t/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    if (!cleanEndpoint) {
        throw new Error('WATI endpoint is missing');
    }

    if (!token) {
        throw new Error('WATI token is missing');
    }

    if (!cleanNumber) {
        throw new Error(
            'Customer WhatsApp number is missing'
        );
    }

    const sendTemplate = async (
        selectedTemplate,
        parameters
    ) => {

        const url =
            `${cleanEndpoint}/api/v1/sendTemplateMessage` +
            `?whatsappNumber=${cleanNumber}`;

        const response = await axios.post(
            url,
            {
                template_name:
                    selectedTemplate,

                broadcast_name:
                    selectedTemplate,

                parameters
            },
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`,

                    'Content-Type':
                        'application/json'
                }
            }
        );

        console.log(
            'WATI TEMPLATE RESPONSE:',
            {
                template:
                    selectedTemplate,

                result:
                    response.data?.result,

                info:
                    response.data?.info,

                message:
                    response.data?.message,

                localMessageId:
                    response.data?.local_message_id
            }
        );

        if (response.data?.result === false) {

            const watiMessage =
                response.data?.info ||
                response.data?.message ||
                'WATI rejected the template request';

            throw new Error(watiMessage);
        }

        return response.data;
    };

    /*
     * FILE-SHARING FLOW
     */
    if (
        Array.isArray(attachments) &&
        attachments.length > 0
    ) {

        const sentFiles = [];

        for (const file of attachments) {

            const publicFileUrl =
                String(file.url || '').trim();

            const fileTitle =
                String(
                    file.title ||
                    file.filename ||
                    'Requested file'
                ).trim();

            if (
                !publicFileUrl.startsWith('https://')
            ) {

                throw new Error(
                    `Public HTTPS URL is missing for ${fileTitle}`
                );
            }

            console.log(
                'SENDING WATI DOCUMENT TEMPLATE:',
                {
                    template:
                        fileTemplateName,

                    title:
                        fileTitle,

                    filename:
                        file.filename,

                    url:
                        publicFileUrl
                }
            );

            const result =
                await sendTemplate(
                    fileTemplateName,
                    [
                        {
                            name: 'pdfLink',
                            value: publicFileUrl
                        },
                        {
                            name: '1',
                            value: cleanName
                        },
                        {
                            name: '2',
                            value: fileTitle
                        }
                    ]
                );

            sentFiles.push({
                title:
                    fileTitle,

                filename:
                    file.filename,

                result
            });
        }

        return {
            success: true,
            filesSent: sentFiles.length,
            files: sentFiles
        };
    }

    /*
     * NORMAL DETAILS FLOW
     */
    const normalResult =
        await sendTemplate(
            templateName,
            [
                {
                    name: '1',
                    value: cleanName
                },
                {
                    name: '2',
                    value: cleanMessage
                }
            ]
        );

    return {
        success: true,
        filesSent: 0,
        result: normalResult
    };
};

module.exports = {
    sendWhatsappMessage
};