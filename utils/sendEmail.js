import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import path from "path";
import { fileURLToPath } from "url";

// Needed to handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Configure handlebars as template engine
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

  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    template: options.template, // e.g. 'resetPassword'
    context: options.context,   // variables for handlebars
  };

  const info = await transporter.sendMail(message);
  console.log("Message sent: %s", info.messageId);
};

export default sendEmail;
