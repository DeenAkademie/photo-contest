// Follow this setup guide to integrate the Deno runtime into your project:
// https://deno.com/manual/examples/deploy

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Definiere Umgebungsvariablen mit Fallback-Werten
const BASE_URL =
  Deno.env.get('BASE_URL') || 'https://fotocontest.deen-akademie.com';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SENDER_EMAIL =
  Deno.env.get('SENDER_EMAIL') || 'noreply@deen-akademie.com';
const SENDER_NAME = Deno.env.get('SENDER_NAME') || 'Foto Contest';

// Umgebungsvariable für den Entwicklungsmodus
const FORCE_DEV_MODE = Deno.env.get('FORCE_DEV_MODE') === 'true' || false;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, token, photoId } = await req.json();

    // Dynamische BASE_URL basierend auf der Request-URL
    let dynamicBaseUrl = BASE_URL;

    // Extrahiere den Origin aus der Request-URL
    const requestUrl = new URL(req.url);

    // Wenn wir in der Entwicklungsumgebung sind (localhost oder 127.0.0.1)
    if (
      requestUrl.hostname.includes('localhost') ||
      requestUrl.hostname.includes('127.0.0.1')
    ) {
      // Für lokale Entwicklung: Verwende http://localhost:5173
      dynamicBaseUrl = 'http://localhost:5173';
    }

    console.log(`Using BASE_URL: ${dynamicBaseUrl}`);

    // Erstelle die Bestätigungs-URL mit der dynamischen BASE_URL
    const confirmationUrl = `${dynamicBaseUrl}/?token=${token}&photoId=${photoId}`;

    // Prüfe, ob wir im Entwicklungsmodus sind oder kein Resend API Key vorhanden ist
    const isDevMode =
      FORCE_DEV_MODE ||
      !RESEND_API_KEY ||
      requestUrl.hostname.includes('localhost') ||
      requestUrl.hostname.includes('127.0.0.1');

    if (isDevMode) {
      // In der Entwicklungsumgebung: Simuliere E-Mail-Versand und gib den Link in der Konsole aus
      console.log('=== ENTWICKLUNGSMODUS: E-Mail-Versand wird simuliert ===');
      console.log(`An: ${email}`);
      console.log(`Betreff: Bestätigen Sie Ihre Stimme beim Foto Contest`);
      console.log(`Bestätigungslink: ${confirmationUrl}`);
      console.log('=== ENDE DER SIMULIERTEN E-MAIL ===');

      // Gib eine erfolgreiche Antwort zurück
      return new Response(
        JSON.stringify({
          success: true,
          message: 'E-Mail-Versand simuliert (Entwicklungsmodus)',
          confirmationUrl: confirmationUrl,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // In der Produktionsumgebung: Sende tatsächlich eine E-Mail über Resend
      try {
        const emailHtml = `
          <h1>Vielen Dank für Ihre Teilnahme am Foto Contest!</h1>
          <p>Bitte klicken Sie auf den folgenden Link, um Ihre Stimme zu bestätigen:</p>
          <p><a href="${confirmationUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Stimme bestätigen</a></p>
          <p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
          <p>${confirmationUrl}</p>
          <p>Der Link ist eine Stunde gültig.</p>
          <p>Wenn Sie diese E-Mail nicht angefordert haben, können Sie sie ignorieren.</p>
        `;

        const emailText = `
          Vielen Dank für Ihre Teilnahme am Foto Contest!
          
          Bitte klicken Sie auf den folgenden Link, um Ihre Stimme zu bestätigen:
          ${confirmationUrl}
          
          Der Link ist eine Stunde gültig.
          
          Wenn Sie diese E-Mail nicht angefordert haben, können Sie sie ignorieren.
        `;

        // Resend API-Anfrage
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: [email],
            subject: 'Bestätigen Sie Ihre Stimme beim Foto Contest',
            html: emailHtml,
            text: emailText,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Resend API Fehler:', errorData);
          throw new Error(`Resend API Fehler: ${JSON.stringify(errorData)}`);
        }

        const responseData = await response.json();
        console.log('Resend API Antwort:', responseData);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'E-Mail erfolgreich gesendet',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (emailError) {
        console.error('Fehler beim E-Mail-Versand:', emailError);

        // Bei Fehler im E-Mail-Versand: Fallback auf Entwicklungsmodus
        return new Response(
          JSON.stringify({
            success: true,
            message: 'E-Mail-Versand fehlgeschlagen, Fallback auf Simulation',
            confirmationUrl: confirmationUrl,
            error: emailError.message,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }
  } catch (error) {
    console.error('Error in function:', error);
    return new Response(
      JSON.stringify({
        error: (error as Error).message || 'Ein Fehler ist aufgetreten',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
