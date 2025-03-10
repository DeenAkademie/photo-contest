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

// EmailJS Konfiguration
const EMAILJS_SERVICE_ID =
  Deno.env.get('EMAILJS_SERVICE_ID') || 'your-service-id';
const EMAILJS_TEMPLATE_ID =
  Deno.env.get('EMAILJS_TEMPLATE_ID') || 'your-template-id';
const EMAILJS_PUBLIC_KEY =
  Deno.env.get('EMAILJS_PUBLIC_KEY') || 'your-public-key';
const EMAILJS_PRIVATE_KEY =
  Deno.env.get('EMAILJS_PRIVATE_KEY') || 'your-private-key';
const SENDER_NAME = Deno.env.get('SENDER_NAME') || 'Foto Contest';

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
    console.log(`EmailJS Service ID: ${EMAILJS_SERVICE_ID}`);
    console.log(`EmailJS Template ID: ${EMAILJS_TEMPLATE_ID}`);
    console.log(
      `EmailJS Public Key: ${EMAILJS_PUBLIC_KEY ? 'Vorhanden' : 'Fehlt'}`
    );
    console.log(
      `EmailJS Private Key: ${EMAILJS_PRIVATE_KEY ? 'Vorhanden' : 'Fehlt'}`
    );
    console.log(`SENDER_NAME: ${SENDER_NAME}`);

    // Erstelle die Bestätigungs-URL mit der dynamischen BASE_URL
    const confirmationUrl = `${dynamicBaseUrl}/?token=${token}&photoId=${photoId}`;

    try {
      // EmailJS API Endpunkt
      const emailjsEndpoint = 'https://api.emailjs.com/api/v1.0/email/send';

      // EmailJS Template Parameter
      const templateParams = {
        to_email: email,
        confirmation_url: confirmationUrl,
        sender_name: SENDER_NAME,
      };

      // EmailJS API Request
      const response = await fetch(emailjsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: templateParams,
          accessToken: EMAILJS_PRIVATE_KEY,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`EmailJS API error: ${response.status} - ${errorData}`);
      }

      console.log('E-Mail erfolgreich gesendet an:', email);

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

      // Bei Fehler im E-Mail-Versand: Gib den Bestätigungslink zurück
      return new Response(
        JSON.stringify({
          success: false,
          message: 'E-Mail-Versand fehlgeschlagen',
          confirmationUrl: confirmationUrl,
          error:
            emailError instanceof Error
              ? emailError.message
              : String(emailError),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
