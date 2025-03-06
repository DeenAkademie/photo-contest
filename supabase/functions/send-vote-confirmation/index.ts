// Follow this setup guide to integrate the Deno runtime into your project:
// https://deno.com/manual/examples/deploy

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Definiere Umgebungsvariablen mit Fallback-Werten
const BASE_URL = Deno.env.get("BASE_URL") || "https://fotocontest.deen-akademie.com";
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.example.com";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587");
const SMTP_USER = Deno.env.get("SMTP_USER") || "your-email@example.com";
const SMTP_PASS = Deno.env.get("SMTP_PASS") || "your-password";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, token, photoId } = await req.json();

    // Dynamische BASE_URL basierend auf der Request-URL
    let dynamicBaseUrl = BASE_URL;
    
    // Extrahiere den Origin aus der Request-URL
    const requestUrl = new URL(req.url);
    
    // Wenn wir in der Entwicklungsumgebung sind (localhost oder 127.0.0.1)
    if (requestUrl.hostname.includes('localhost') || requestUrl.hostname.includes('127.0.0.1')) {
      // Für lokale Entwicklung: Verwende http://localhost:5173
      dynamicBaseUrl = 'http://localhost:5173';
    }
    
    console.log(`Using BASE_URL: ${dynamicBaseUrl}`);

    // Erstelle die Bestätigungs-URL mit der dynamischen BASE_URL
    const confirmationUrl = `${dynamicBaseUrl}/?token=${token}&photoId=${photoId}`;

    // Prüfe, ob wir in der Entwicklungsumgebung sind
    const isLocalDevelopment = requestUrl.hostname.includes('localhost') || requestUrl.hostname.includes('127.0.0.1');

    if (isLocalDevelopment) {
      // In der Entwicklungsumgebung: Simuliere E-Mail-Versand und gib den Link in der Konsole aus
      console.log("=== ENTWICKLUNGSMODUS: E-Mail-Versand wird simuliert ===");
      console.log(`An: ${email}`);
      console.log(`Betreff: Bestätigen Sie Ihre Stimme beim Foto Contest`);
      console.log(`Bestätigungslink: ${confirmationUrl}`);
      console.log("=== ENDE DER SIMULIERTEN E-MAIL ===");
      
      // Gib eine erfolgreiche Antwort zurück
      return new Response(JSON.stringify({ 
        success: true, 
        message: "E-Mail-Versand simuliert (Entwicklungsmodus)",
        confirmationUrl: confirmationUrl 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // In der Produktionsumgebung: Sende tatsächlich eine E-Mail
      // Konfiguriere den SMTP-Client
      const client = new SmtpClient();
      await client.connectTLS({
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        username: SMTP_USER,
        password: SMTP_PASS,
      });

      // Sende die E-Mail
      await client.send({
        from: "Foto Contest <noreply@deen-akademie.com>",
        to: email,
        subject: "Bestätigen Sie Ihre Stimme beim Foto Contest",
        html: `
          <h1>Vielen Dank für Ihre Teilnahme am Foto Contest!</h1>
          <p>Bitte klicken Sie auf den folgenden Link, um Ihre Stimme zu bestätigen:</p>
          <p><a href="${confirmationUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Stimme bestätigen</a></p>
          <p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
          <p>${confirmationUrl}</p>
          <p>Der Link ist eine Stunde gültig.</p>
          <p>Wenn Sie diese E-Mail nicht angefordert haben, können Sie sie ignorieren.</p>
        `,
        content: "",
      });

      await client.close();

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        error: (error as Error).message || "Ein Fehler ist aufgetreten",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
