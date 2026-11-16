package com.mealplanner.service;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@mealcraft.app}")
    private String mailFrom;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    /**
     * Sends the branded MealCraft OTP verification email.
     *
     * @param toEmail The recipient email
     * @param name    The recipient's full name
     * @param otp     The 6-digit plain OTP code
     */
    public void sendOtpEmail(String toEmail, String name, String otp) {
        String cleanName = (name != null && !name.isBlank()) ? name.trim() : "there";

        // If mail credentials are not configured, log to console for development convenience
        if (mailSender == null || mailUsername == null || mailUsername.isBlank()) {
            log.warn("=================================================================");
            log.warn("[DEV MODE] SMTP not configured. Verification code for {}: {}", toEmail, otp);
            log.warn("=================================================================");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject("Your MealCraft verification code: " + otp);

            String htmlBody = buildOtpEmailHtml(cleanName, otp);
            String textFallback = buildOtpEmailText(cleanName, otp);

            helper.setText(textFallback, htmlBody);

            mailSender.send(message);
            log.info("Verification email sent successfully to {}", toEmail);
        } catch (MailSendException e) {
            log.error("SMTP error sending email to {}: {}", toEmail, e.getMessage());
            throw new IllegalArgumentException("Unable to deliver verification code. The mailbox may not exist or cannot accept mail.");
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send verification email. Please try again later.", e);
        }
    }

    /**
     * Sends the branded MealCraft password reset OTP email.
     *
     * @param toEmail The recipient email
     * @param name    The recipient's full name
     * @param otp     The 6-digit plain OTP code
     */
    public void sendPasswordResetOtpEmail(String toEmail, String name, String otp) {
        String cleanName = (name != null && !name.isBlank()) ? name.trim() : "there";

        // If mail credentials are not configured, log to console for development convenience
        if (mailSender == null || mailUsername == null || mailUsername.isBlank()) {
            log.warn("=================================================================");
            log.warn("[DEV MODE] SMTP not configured. Password reset code for {}: {}", toEmail, otp);
            log.warn("=================================================================");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject("Reset your MealCraft password - Code: " + otp);

            String htmlBody = buildPasswordResetEmailHtml(cleanName, otp);
            String textFallback = buildPasswordResetEmailText(cleanName, otp);

            helper.setText(textFallback, htmlBody);

            mailSender.send(message);
            log.info("Password reset email sent successfully to {}", toEmail);
        } catch (MailSendException e) {
            log.error("SMTP error sending password reset email to {}: {}", toEmail, e.getMessage());
            throw new IllegalArgumentException("Unable to deliver password reset code. The mailbox may not exist or cannot accept mail.");
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send password reset email. Please try again later.", e);
        }
    }

    private String buildPasswordResetEmailHtml(String name, String otp) {
        return "<!DOCTYPE html>"
                + "<html>"
                + "<head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>"
                + "<body style=\"margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;\">"
                + "  <table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='background-color: #f8fafc; padding: 36px 16px;'>"
                + "    <tr>"
                + "      <td align='center'>"
                + "        <table role='presentation' width='100%' style='max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;' cellspacing='0' cellpadding='0'>"
                + "          <tr><td style='background-color: #f97316; height: 5px;'></td></tr>"
                + "          <tr>"
                + "            <td style='padding: 36px 32px;'>"
                + "              <div style='margin-bottom: 24px; text-align: left;'>"
                + "                <h1 style='margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;'>MealCraft</h1>"
                + "                <p style='margin: 4px 0 0 0; font-size: 13px; color: #64748b;'>Password Reset Request</p>"
                + "              </div>"
                + "              <p style='font-size: 15px; color: #1e293b; margin: 0 0 16px 0; font-weight: 600;'>Hello " + escapeHtml(name) + ",</p>"
                + "              <p style='font-size: 14px; line-height: 22px; color: #334155; margin: 0 0 16px 0;'>"
                + "                We received a request to reset your MealCraft account password.<br/>"
                + "                Please use the verification code below to authorize your password change:"
                + "              </p>"
                + "              <div style='background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px 0; text-align: center; margin: 24px 0;'>"
                + "                <span style=\"font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a; display: inline-block; margin-left: 8px;\">"
                + "                  " + otp
                + "                </span>"
                + "              </div>"
                + "              <p style='font-size: 13px; line-height: 20px; color: #475569; margin: 0 0 12px 0;'>"
                + "                This verification code will expire in <strong>10 minutes</strong>. For your security, do not share this code with anyone."
                + "              </p>"
                + "              <p style='font-size: 12px; line-height: 18px; color: #94a3b8; margin: 0 0 24px 0;'>"
                + "                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged."
                + "              </p>"
                + "              <p style='font-size: 14px; color: #334155; margin: 0;'>Regards,<br/><strong>The MealCraft Team</strong></p>"
                + "            </td>"
                + "          </tr>"
                + "          <tr>"
                + "            <td style='background-color: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center;'>"
                + "              <p style='margin: 0; font-size: 12px; color: #64748b;'>MealCraft &bull; AI Recipe &amp; Meal Planner</p>"
                + "              <p style='margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;'>This is an automated security message. Please do not reply.</p>"
                + "            </td>"
                + "          </tr>"
                + "        </table>"
                + "      </td>"
                + "    </tr>"
                + "  </table>"
                + "</body>"
                + "</html>";
    }

    private String buildPasswordResetEmailText(String name, String otp) {
        return "MealCraft | Password Reset Request\n\n"
                + "Hello " + name + ",\n\n"
                + "We received a request to reset your MealCraft account password.\n"
                + "Please use the verification code below to authorize your password change:\n\n"
                + "  " + otp + "\n\n"
                + "This verification code will expire in 10 minutes. For your security, do not share this code with anyone.\n\n"
                + "If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.\n\n"
                + "Regards,\nThe MealCraft Team\n";
    }

    private String buildOtpEmailHtml(String name, String otp) {
        return "<!DOCTYPE html>"
                + "<html>"
                + "<head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>"
                + "<body style=\"margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;\">"
                + "  <table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='background-color: #f8fafc; padding: 36px 16px;'>"
                + "    <tr>"
                + "      <td align='center'>"
                + "        <table role='presentation' width='100%' style='max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;' cellspacing='0' cellpadding='0'>"
                + "          <tr><td style='background-color: #10b981; height: 5px;'></td></tr>"
                + "          <tr>"
                + "            <td style='padding: 36px 32px;'>"
                + "              <div style='margin-bottom: 24px; text-align: left;'>"
                + "                <h1 style='margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;'>MealCraft</h1>"
                + "                <p style='margin: 4px 0 0 0; font-size: 13px; color: #64748b;'>AI Recipe &amp; Meal Planner</p>"
                + "              </div>"
                + "              <p style='font-size: 15px; color: #1e293b; margin: 0 0 16px 0; font-weight: 600;'>Hello " + escapeHtml(name) + ",</p>"
                + "              <p style='font-size: 14px; line-height: 22px; color: #334155; margin: 0 0 16px 0;'>"
                + "                Thank you for creating a MealCraft account.<br/>"
                + "                Please use the one-time verification code below to verify your email address and complete your registration:"
                + "              </p>"
                + "              <div style='background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px 0; text-align: center; margin: 24px 0;'>"
                + "                <span style=\"font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a; display: inline-block; margin-left: 8px;\">"
                + "                  " + otp
                + "                </span>"
                + "              </div>"
                + "              <p style='font-size: 13px; line-height: 20px; color: #475569; margin: 0 0 12px 0;'>"
                + "                This verification code will expire in <strong>10 minutes</strong>. For your security, do not share this code with anyone."
                + "              </p>"
                + "              <p style='font-size: 12px; line-height: 18px; color: #94a3b8; margin: 0 0 24px 0;'>"
                + "                If you did not request this code, no action is required and you can safely ignore this email."
                + "              </p>"
                + "              <p style='font-size: 14px; color: #334155; margin: 0;'>Regards,<br/><strong>The MealCraft Team</strong></p>"
                + "            </td>"
                + "          </tr>"
                + "          <tr>"
                + "            <td style='background-color: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center;'>"
                + "              <p style='margin: 0; font-size: 12px; color: #64748b;'>MealCraft &bull; AI Recipe &amp; Meal Planner</p>"
                + "              <p style='margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;'>This is an automated security message. Please do not reply.</p>"
                + "            </td>"
                + "          </tr>"
                + "        </table>"
                + "      </td>"
                + "    </tr>"
                + "  </table>"
                + "</body>"
                + "</html>";
    }

    private String buildOtpEmailText(String name, String otp) {
        return "MealCraft | AI Recipe & Meal Planner\n\n"
                + "Hello " + name + ",\n\n"
                + "Thank you for creating a MealCraft account.\n"
                + "Please use the one-time verification code below to verify your email address and complete your registration:\n\n"
                + "  " + otp + "\n\n"
                + "This verification code will expire in 10 minutes. For your security, do not share this code with anyone.\n\n"
                + "If you did not request this code, no action is required and you can safely ignore this email.\n\n"
                + "Regards,\nThe MealCraft Team\n";
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
