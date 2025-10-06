import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import path from "path";
import { fileURLToPath } from "url";

// Needed to handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sendEmail = async (options) => {
  // 1. Create the base transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // 2. Conditionally configure the Handlebars middleware
  if (options.template) {
    // ONLY attach the middleware if a template is actually being used.
    transporter.use(
      "compile",
      hbs({
        viewEngine: {
          extname: ".hbs",
          partialsDir: path.resolve(__dirname, "../templates/"),
          defaultLayout: false,
        },
        viewPath: path.resolve(__dirname, "../templates/"),
        extName: ".hbs",
      })
    );
  }

  // console.log(options);

  // 3. Construct the message object (simplified for clarity)
  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.to || options.email, // Use 'to' or 'email' based on your data structure
    subject: options.subject,
  };

  if (options.template) {
    // If template is used, include template/context
    message.template = options.template;
    message.context = options.context || {};
  } else if (options.message) {
    // If no template, use simple text body
    message.text = options.message;
  }

  // 4. Send the mail
  const info = await transporter.sendMail(message);
  console.log("Message sent: %s", info.messageId);
};

export default sendEmail;
