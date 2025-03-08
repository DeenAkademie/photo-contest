import { createClient } from '@supabase/supabase-js';

// Erkennung der Umgebung basierend auf der Umgebungsvariable oder der aktuellen URL
const isDevelopment = import.meta.env.VITE_ENV === 'development' || 
  (typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

// Konfiguration für lokale Entwicklung oder Produktion
const supabaseUrl = isDevelopment
  ? 'http://localhost:54321'
  : import.meta.env.VITE_SUPABASE_URL;

const supabaseAnonKey = isDevelopment
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
  : import.meta.env.VITE_SUPABASE_ANON_KEY;

// Logging für Debugging
console.log('Umgebung:', isDevelopment ? 'Lokale Entwicklung' : 'Produktion');
console.log('Supabase URL:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Fehlende Supabase Umgebungsvariablen');
}

// Erstelle den Supabase-Client mit globalen Headers
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
});
