import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_placeholder';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'public_placeholder';

// Templates
const TEMPLATE_WELCOME = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_WELCOME || 'template_welcome_placeholder';
const TEMPLATE_TICKET = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_TICKET || 'template_ticket_placeholder';

export const sendWelcomeEmail = async (toEmail, toName, role, password, companyName, companyCode) => {
  try {
    const templateParams = {
      to_email: toEmail,
      to_name: toName,
      role: role,
      password: password,
      company_name: companyName,
      company_code: companyCode,
      login_url: window.location.origin + '/login'
    };

    const response = await emailjs.send(SERVICE_ID, TEMPLATE_WELCOME, templateParams, PUBLIC_KEY);
    console.log('Welcome email sent successfully!', response.status, response.text);
    return true;
  } catch (err) {
    console.error('Failed to send welcome email:', err);
    return false;
  }
};

export const sendWorkshopTicket = async (toEmail, toName, workshopTitle, date, time, ticketNumber) => {
  try {
    const templateParams = {
      to_email: toEmail,
      to_name: toName,
      workshop_title: workshopTitle,
      workshop_date: date,
      workshop_time: time,
      ticket_number: ticketNumber
    };

    const response = await emailjs.send(SERVICE_ID, TEMPLATE_TICKET, templateParams, PUBLIC_KEY);
    console.log('Workshop ticket sent successfully!', response.status, response.text);
    return true;
  } catch (err) {
    console.error('Failed to send workshop ticket:', err);
    return false;
  }
};
