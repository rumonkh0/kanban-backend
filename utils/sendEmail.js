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


/**
 * Sends a bulk email to a list of recipients defined by IDs.
 *
 * @param {object} params
 * @param {mongoose.Model} params.Model - The Mongoose Model (e.g., Client, Freelancer, User) to fetch the recipient from.
 * @param {Array<string>} params.recipientIds - Array of IDs (e.g., Client IDs, Freelancer IDs).
 * @param {string} params.subject - The subject line for the email.
 * @param {string} params.message - The base message body (without Hi/Best Regards).
 * @param {string} [params.modelPath="user"] - Optional: The field name to populate (e.g., "user" if email is nested).
 */
export const bulkSendEmails = async ({
  Model,
  recipientIds,
  subject,
  message,
  modelPath = "user",
}) => {
  if (!recipientIds || recipientIds.length === 0) {
    console.log("No recipients provided for bulk email.");
    return;
  }

  // --- 1. Concurrent Recipient Lookup ---

  // Create an array of promises, fetching each recipient and populating their user/email/name
  const fetchPromises = recipientIds.map((id) =>
    Model.findById(id).populate(modelPath, "email name")
  );

  // Execute all lookups concurrently
  const recipients = await Promise.all(fetchPromises);

  // --- 2. Filter and Prepare Email Promises ---

  const emailPromises = recipients
    .filter(
      (recipient) =>
        // Ensure the recipient exists AND has the necessary email property
        recipient && recipient[modelPath] && recipient[modelPath].email
    )
    .map((recipient) => {
      // Get the embedded user/email object
      const user = recipient[modelPath];

      // Attempt to personalize the greeting
      const recipientName = user.name || "valued recipient";

      // Construct the final email body with a standard format
      const finalMessageBody = `Hi ${recipientName},

${message}

Best regards,
The Team`;

      return sendEmail({
        to: user.email,
        subject: subject,
        message: finalMessageBody,
      });
    });

  // --- 3. Concurrent Email Sending and Reporting ---

  if (emailPromises.length === 0) {
    console.log("No valid emails to send after filtering.");
    return;
  }

  // Use Promise.allSettled() to attempt all remaining emails, logging individual failures
  const results = await Promise.allSettled(emailPromises);

  const successfulSends = results.filter(
    (r) => r.status === "fulfilled"
  ).length;
  const failedSends = results.filter((r) => r.status === "rejected");

  console.log(
    `Bulk Email Report: Sent ${successfulSends} emails successfully.`
  );

  if (failedSends.length > 0) {
    console.error(
      `Bulk Email Report: ${failedSends.length} emails failed to send.`
    );
    // Optionally log details of the failures:
    // failedSends.forEach(fail => console.error("Failure reason:", fail.reason));
  }
};

export default sendEmail;
