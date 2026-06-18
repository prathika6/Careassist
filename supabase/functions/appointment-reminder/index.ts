// Supabase Edge Function: appointment-reminder
// Schedule with pg_cron: SELECT cron.schedule('0 * * * *', $$SELECT net.http_post(...)$$);

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1h  = new Date(now.getTime() + 60 * 60 * 1000);

  // Fetch upcoming accepted appointments in next 24h
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`*, patient:patient_id(*, user:user_id(full_name,phone)), doctor:doctor_id(full_name)`)
    .eq('status', 'accepted')
    .gte('appointment_date', now.toISOString().split('T')[0])
    .lte('appointment_date', in24h.toISOString().split('T')[0]);

  for (const appt of appointments || []) {
    const apptDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`);
    const diffMs = apptDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    let reminderType = null;
    if (diffHours <= 1 && diffHours > 0.5) reminderType = '1h';
    else if (diffHours <= 24 && diffHours > 23) reminderType = '24h';

    if (!reminderType) continue;

    const phone = appt.patient?.user?.phone;
    const name = appt.patient?.user?.full_name;
    const doctorName = appt.doctor?.full_name;
    const timeStr = appt.appointment_time?.slice(0, 5);
    const label = reminderType === '24h' ? 'tomorrow' : 'in 1 hour';
    const msg = `CareAssist Reminder: Hi ${name}, your appointment with Dr. ${doctorName} is ${label} at ${timeStr}. Please be ready.`;

    // Insert app notification
    await supabase.from('notifications').insert({
      user_id: appt.patient?.user_id,
      patient_id: appt.patient_id,
      type: 'appointment_reminder',
      title: '📅 Appointment Reminder',
      message: msg,
    });

    // Send SMS if phone available
    if (phone) {
      await supabase.functions.invoke('send-notification', {
        body: { channel: 'sms', to: phone, message: msg }
      });
    }
  }

  return new Response(JSON.stringify({ processed: appointments?.length || 0 }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
