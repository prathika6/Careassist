// ── Notification Service ────────────────────────────────────
import { supabase } from '../lib/supabase';

export async function sendAppNotification({ userId, patientId, type, title, message, metadata = {} }) {
  try {
    await supabase.from('notifications').insert({
      user_id: userId, patient_id: patientId || null,
      type, title, message, is_read: false,
      action_url: metadata.action_url || null,
      created_at: new Date().toISOString()
    });
    await supabase.from('notification_logs').insert({
      user_id: userId, patient_id: patientId || null,
      type, channel: 'app', title, message,
      status: 'delivered', delivered_at: new Date().toISOString(),
      metadata
    });
  } catch (err) { console.error('App notification error:', err); }
}

export async function sendSMSNotification({ phone, message, userId, patientId, type }) {
  // Calls Supabase Edge Function which uses Twilio
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: { channel: 'sms', to: phone, message, userId, patientId, type }
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('SMS notification error:', err);
    await supabase.from('notification_logs').insert({
      user_id: userId, patient_id: patientId, type, channel: 'sms',
      title: 'SMS', message, status: 'failed', error_message: err.message
    });
  }
}

export async function sendWhatsAppNotification({ phone, message, userId, patientId, type }) {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: { channel: 'whatsapp', to: phone, message, userId, patientId, type }
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('WhatsApp notification error:', err);
    await supabase.from('notification_logs').insert({
      user_id: userId, patient_id: patientId, type, channel: 'whatsapp',
      title: 'WhatsApp', message, status: 'failed', error_message: err.message
    });
  }
}

export async function notifyAppointmentReminder({ appointment, patientProfile, doctorProfile, hoursUntil }) {
  const timeLabel = hoursUntil >= 24 ? 'tomorrow' : hoursUntil >= 1 ? `in ${hoursUntil} hour(s)` : 'NOW';
  const msg = `Your appointment with Dr. ${doctorProfile.full_name} is ${timeLabel} at ${appointment.appointment_time?.slice(0,5)} on ${appointment.appointment_date}.`;

  await sendAppNotification({
    userId: appointment.patient_id_user,
    patientId: appointment.patient_id,
    type: 'appointment_reminder',
    title: '📅 Appointment Reminder',
    message: msg
  });

  if (patientProfile?.phone) {
    await sendSMSNotification({ phone: patientProfile.phone, message: `CareAssist: ${msg}`, userId: appointment.patient_id_user, patientId: appointment.patient_id, type: 'appointment_reminder' });
  }
}

export async function notifyMedicineReminder({ medicine, patientProfile, patientUserId }) {
  const msg = `Time to take your ${medicine.medicine_name} ${medicine.dosage}. ${medicine.before_food ? 'Take before food.' : 'Take after food.'}`;

  await sendAppNotification({
    userId: patientUserId,
    patientId: medicine.patient_id,
    type: 'medicine_reminder',
    title: `💊 Medicine Reminder`,
    message: msg
  });

  if (patientProfile?.phone) {
    await sendSMSNotification({ phone: patientProfile.phone, message: `CareAssist: ${msg}`, userId: patientUserId, patientId: medicine.patient_id, type: 'medicine_reminder' });
  }
}

export async function triggerEmergencyAlerts({ patientId, patient, location, emergencyContacts }) {
  const locationStr = location?.address || (location?.latitude ? `https://maps.google.com/?q=${location.latitude},${location.longitude}` : 'Location not available');
  const msg = `🚨 EMERGENCY ALERT: ${patient.full_name} has activated an SOS. Location: ${locationStr}. Please respond immediately.`;

  for (const contact of emergencyContacts) {
    if (contact.phone) {
      await sendSMSNotification({ phone: contact.phone, message: msg, userId: contact.user_id || patientId, patientId, type: 'emergency' });
      await sendWhatsAppNotification({ phone: contact.phone, message: msg, userId: contact.user_id || patientId, patientId, type: 'emergency' });
    }
  }
}
