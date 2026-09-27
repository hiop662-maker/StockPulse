import logging

logger = logging.getLogger("stockpulse.email")

def send_reset_password_email(email: str, token: str, frontend_url: str = "http://localhost:3000"):
    reset_link = f"{frontend_url}/reset-password?token={token}"
    # Im lokalen Dev-Betrieb in Konsole loggen; in Prod SMTP/SendGrid anbinden
    logger.info(f"--- [PASSWORD RESET EMAIL] ---")
    logger.info(f"Empfänger: {email}")
    logger.info(f"Link: {reset_link}")
    logger.info(f"-------------------------------")
    print(f"\n[EMAIL SIMULATION] Reset-Link für {email}: {reset_link}\n")