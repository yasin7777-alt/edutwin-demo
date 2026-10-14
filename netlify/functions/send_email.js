const nodemailer = require('nodemailer');

exports.handler = async function(event, context) {
    // Разрешаем только POST запросы
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { to, subject, text } = JSON.parse(event.body);

        // Проверка переменных окружения
        if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
            console.error('Ошибка: Не заданы переменные окружения GMAIL_USER или GMAIL_PASS');
            throw new Error('Server configuration error');
        }

        // Настройка транспортера
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, 
                pass: process.env.GMAIL_PASS  
            }
        });

        const mailOptions = {
            from: `"EduTwin Assistant" <${process.env.GMAIL_USER}>`,
            to: to,
            subject: subject,
            text: text
        };

        await transporter.sendMail(mailOptions);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Email sent successfully' })
        };

    } catch (error) {
        console.error('Email send error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};