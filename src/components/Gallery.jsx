import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaImages } from 'react-icons/fa';
import { Button } from './ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from './ui/card';
import { useToast } from './ui/use-toast';
import { Toaster } from './ui/toaster';
import { Progress } from './ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import PropTypes from 'prop-types';

function Gallery({ supabase }) {
  const [photos, setPhotos] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedPhotoId, setVotedPhotoId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [pendingVotePhotoId, setPendingVotePhotoId] = useState(null);
  const [email, setEmail] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const { toast } = useToast();

  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Supabase Client verfügbar:', !!supabase);

      // Teste die Verbindung mit einer einfachen Abfrage
      console.log('Teste Verbindung zur Datenbank...');

      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('votes', { ascending: false });

      console.log('Anfrage an photos-Tabelle gesendet');
      console.log('Antwortdaten:', data);
      console.log('Fehler:', error);

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Fotos konnten nicht geladen werden',
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  const checkVoteStatus = useCallback(async () => {
    try {
      // Prüfen, ob ein Cookie mit einer Email-Adresse existiert
      const storedEmail = localStorage.getItem('voter_email');

      if (storedEmail) {
        setEmail(storedEmail);

        // Prüfen, ob diese Email bereits abgestimmt hat
        const { data, error } = await supabase
          .from('votes')
          .select('photo_id')
          .eq('email', storedEmail)
          .limit(1);

        if (error) {
          console.error('Error checking vote status:', error);
        }

        // Wenn Daten vorhanden sind, nehmen wir das erste Element
        const voteData = data && data.length > 0 ? data[0] : null;
        setHasVoted(!!voteData);
        setVotedPhotoId(voteData?.photo_id || null);
      }
    } catch (error) {
      console.error('Error checking vote status:', error);
    }
  }, [supabase]);

  useEffect(() => {
    checkVoteStatus();
    fetchPhotos();
  }, [checkVoteStatus, fetchPhotos]);

  // Neuer useEffect-Hook, um URL-Parameter zu verarbeiten
  useEffect(() => {
    // URL-Parameter auslesen
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');

    // Wenn Token vorhanden ist, rufe die confirmVote-Funktion auf
    if (token) {
      console.log('Token in URL gefunden:', token);
      confirmVote(token);

      // Parameter aus der URL entfernen
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []); // Leeres Dependency-Array, damit es nur einmal beim Laden ausgeführt wird

  const initiateVote = (photoId) => {
    setPendingVotePhotoId(photoId);
    setEmailModalOpen(true);
    setConfirmationSent(false);
  };

  const sendConfirmationEmail = async () => {
    if (!email || !email.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Ungültige Email',
        description: 'Bitte geben Sie eine gültige Email-Adresse ein',
      });
      return;
    }

    try {
      setUploading(true);

      // Generiere einen einmaligen Token
      const token =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      // Speichere den Token in der Datenbank mit Ablaufzeit (1 Stunde)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      try {
        // 1. Alte Stimme löschen (falls vorhanden)
        await supabase.from('votes').delete().eq('email', email);

        // Kurze Verzögerung, um sicherzustellen, dass die Löschung abgeschlossen ist
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 2. Speichere den Token in der Datenbank mit Ablaufzeit (1 Stunde)
        const { error: tokenError } = await supabase
          .from('vote_confirmations')
          .insert({
            token: token,
            email: email,
            photo_id: pendingVotePhotoId,
            expires_at: expiresAt.toISOString(),
          });

        if (tokenError) {
          console.error('Fehler beim Speichern des Tokens:', tokenError);
          throw new Error('Fehler beim Speichern des Tokens');
        }

        // 3. Sende die Bestätigungsmail über die Edge Function
        try {
          const { data: emailData, error: emailError } =
            await supabase.functions.invoke('send-vote-confirmation', {
              body: {
                email: email,
                token: token,
                photoId: pendingVotePhotoId,
              },
            });

          if (emailError) {
            console.error(
              'Fehler beim Aufrufen der Edge Function:',
              emailError
            );
            throw new Error(
              `Supabase Edge Function Fehler: ${emailError.message}`
            );
          }

          console.log('Edge Function Antwort:', emailData);
        } catch (emailFunctionError) {
          console.error(
            'Fehler beim E-Mail-Versand über Edge Function:',
            emailFunctionError
          );
          throw emailFunctionError;
        }

        // 4. Speichere die Email im localStorage für zukünftige Abstimmungen
        localStorage.setItem('voter_email', email);

        setConfirmationSent(true);

        toast({
          title: 'Bestätigungsmail gesendet',
          description:
            'Bitte überprüfen Sie Ihren Posteingang und bestätigen Sie Ihre Stimme',
        });
      } catch (operationError) {
        // Fehler bei Datenbank oder E-Mail-Versand
        console.error('Operationsfehler:', operationError);

        // Versuche, den Token zu löschen, falls er erstellt wurde
        try {
          await supabase.from('vote_confirmations').delete().eq('token', token);
        } catch (cleanupError) {
          console.error(
            'Fehler beim Bereinigen des fehlgeschlagenen Tokens:',
            cleanupError
          );
        }

        throw operationError; // Weitergeben an den äußeren catch-Block
      }
    } catch (error) {
      // Allgemeiner Fehler-Handler
      console.error('Gesamtfehler beim E-Mail-Versand:', error);

      // Benutzerfreundliche Fehlermeldung basierend auf dem Fehlertyp
      let errorTitle = 'Fehler';
      let errorDescription =
        'Die Bestätigungsmail konnte nicht gesendet werden';

      if (error.message.includes('Datenbank-Fehler')) {
        errorTitle = 'Datenbank-Fehler';
        errorDescription =
          'Ihre Anfrage konnte nicht gespeichert werden. Bitte versuchen Sie es später erneut.';
      } else if (
        error.message.includes('Lokale Edge Function') ||
        error.message.includes('Netzwerkfehler (lokal)')
      ) {
        errorTitle = 'Lokaler Server-Fehler';
        errorDescription =
          'Der lokale E-Mail-Server ist nicht erreichbar. Bitte starten Sie den Server neu.';
      } else if (
        error.message.includes('Supabase Edge Function') ||
        error.message.includes('Supabase Invoke Fehler')
      ) {
        errorTitle = 'Server-Fehler';
        errorDescription =
          'Der E-Mail-Server ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.';
      }

      toast({
        variant: 'destructive',
        title: errorTitle,
        description: errorDescription,
      });
    } finally {
      setUploading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleDeletePhoto = async (photoId) => {
    try {
      // First delete related votes
      const { error: votesError } = await supabase
        .from('votes')
        .delete()
        .eq('photo_id', photoId);

      if (votesError) throw votesError;

      // Then delete the photo
      const { error: photoError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (photoError) throw photoError;

      // Refresh the photos list
      await fetchPhotos();

      toast({
        title: 'Erfolgreich gelöscht',
        description: 'Das Foto wurde erfolgreich gelöscht',
      });
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Das Foto konnte nicht gelöscht werden',
      });
    }
  };

  // Sortiere die Einträge nach Abstimmungszeitpunkt
  const sortedEntries = photos.sort((a, b) => {
    // Wenn ein Eintrag eine Abstimmung hat, kommt er nach vorne
    if (a.votes && !b.votes) return -1;
    if (!a.votes && b.votes) return 1;

    // Bei gleicher Abstimmungssituation nach Datum sortieren
    return b.timestamp - a.timestamp;
  });

  // Füge eine Route für die Bestätigung hinzu
  // Diese Funktion wird aufgerufen, wenn der Benutzer auf den Link in der E-Mail klickt
  const confirmVote = async (token) => {
    try {
      // Verifiziere den Token
      const { data, error: confirmationError } = await supabase
        .from('vote_confirmations')
        .select('*')
        .eq('token', token)
        .limit(1);

      const confirmationData = data && data.length > 0 ? data[0] : null;

      if (confirmationError || !confirmationData) {
        throw new Error('Ungültiger oder abgelaufener Token');
      }

      const email = confirmationData.email;
      const photoId = confirmationData.photo_id;

      // Prüfe, ob der Token abgelaufen ist
      if (new Date(confirmationData.expires_at) < new Date()) {
        throw new Error('Der Bestätigungslink ist abgelaufen');
      }

      try {
        // 1. Alte Stimme löschen (falls vorhanden)
        await supabase.from('votes').delete().eq('email', email);

        // Kurze Verzögerung, um sicherzustellen, dass die Löschung abgeschlossen ist
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 2. Neue Stimme eintragen
        // Die Aktualisierung der Stimmenanzahl in der photos-Tabelle wird durch einen Datenbank-Trigger erledigt
        const { error: insertError } = await supabase.from('votes').insert({
          email: email,
          photo_id: photoId,
          created_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error('Fehler beim Speichern der Stimme:', insertError);
          throw new Error('Fehler beim Speichern der Stimme');
        }

        // 3. Lösche den verwendeten Token
        await supabase.from('vote_confirmations').delete().eq('token', token);

        // 4. Aktualisiere den Status
        setHasVoted(true);
        setVotedPhotoId(photoId);
        localStorage.setItem('voter_email', email);

        // 5. Aktualisiere die Fotoliste
        fetchPhotos();

        // 6. Zeige eine Erfolgsmeldung
        toast({
          title: 'Vielen Dank!',
          description: 'Ihre Stimme wurde erfolgreich gezählt.',
        });
      } catch (error) {
        console.error('Fehler beim Abstimmen:', error);
        throw new Error('Fehler beim Speichern der Stimme');
      }
    } catch (error) {
      console.error('Error confirming vote:', error);
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message || 'Fehler bei der Bestätigung der Stimme',
      });
    }
  };

  if (loading) {
    return (
      <div className='w-full h-screen flex flex-col items-center justify-center gap-4'>
        <Progress value={33} className='w-[60%] max-w-md' />
        <p className='text-muted-foreground'>Fotos werden geladen...</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className='w-full min-h-[calc(100vh-64px)] flex items-center justify-center bg-background'>
        <Card className='max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='flex flex-col items-center gap-4'>
              <FaImages className='h-12 w-12 text-muted-foreground' />
              Keine Fotos vorhanden
            </CardTitle>
            <CardDescription className='text-center'>
              Aktuell wurden noch keine Fotos zum Wettbewerb hochgeladen. Seien
              Sie der Erste und teilen Sie Ihr bestes Foto!
            </CardDescription>
          </CardHeader>
          <CardFooter className='flex justify-center'>
            <Button asChild>
              <Link to='/upload'>
                <svg
                  className='mr-2 h-4 w-4'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 4v16m8-8H4'
                  />
                </svg>
                Foto hochladen
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto py-8 px-4'>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
        {sortedEntries.map((photo) => (
          <Card
            key={photo.id}
            className={`overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer
              ${photo.id === votedPhotoId ? 'ring-2 ring-primary' : ''}
            `}
          >
            <div
              className='relative aspect-square mb-2 overflow-hidden rounded-lg'
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.image_url}
                alt={`Foto von ${photo.account_name}`}
                className='w-full h-full object-cover'
              />
              {/* Markierung für das gewählte Foto */}
              {photo.id === votedPhotoId && (
                <div className='absolute top-2 right-2 z-10'>
                  <Button
                    variant='secondary'
                    size='sm'
                    className='pointer-events-none text-xs py-1 h-7'
                    title='Diese Markierung ist nur in diesem Browser sichtbar'
                  >
                    Ihre Wahl
                    <span className='block text-[9px] opacity-80'>
                      (nur in diesem Browser)
                    </span>
                  </Button>
                </div>
              )}
            </div>
            <CardHeader className='p-3 space-y-1'>
              <CardDescription className='text-sm'>
                von {photo.account_name}
              </CardDescription>
              <CardDescription className='text-sm'>
                {photo.votes} {photo.votes === 1 ? 'Stimme' : 'Stimmen'}
              </CardDescription>
            </CardHeader>
            <CardFooter className='p-3 pt-0'>
              <Button
                className='w-full h-8 text-sm'
                onClick={() => initiateVote(photo.id)}
                disabled={uploading}
                variant={photo.id === votedPhotoId ? 'secondary' : 'default'}
              >
                {uploading && (
                  <svg
                    className='mr-2 h-3 w-3 animate-spin'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    />
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    />
                  </svg>
                )}
                {uploading
                  ? 'Wird verarbeitet...'
                  : photo.id === votedPhotoId
                  ? 'Ihre aktuelle Wahl'
                  : hasVoted
                  ? 'Stimme ändern'
                  : 'Abstimmen'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Email Modal */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Abstimmung bestätigen</DialogTitle>
            <DialogDescription>
              {confirmationSent
                ? 'Wir haben Ihnen eine Bestätigungsmail gesendet. Bitte überprüfen Sie Ihren Posteingang und klicken Sie auf den Bestätigungslink.'
                : 'Bitte geben Sie Ihre E-Mail-Adresse ein, um Ihre Stimme abzugeben. Sie erhalten eine Bestätigungsmail.'}
            </DialogDescription>
          </DialogHeader>

          {!confirmationSent && (
            <>
              <div className='grid gap-4 py-4'>
                <div className='grid grid-cols-4 items-center gap-4'>
                  <Label htmlFor='email' className='text-right'>
                    E-Mail
                  </Label>
                  <Input
                    id='email'
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='ihre.email@beispiel.de'
                    className='col-span-3'
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={sendConfirmationEmail} disabled={uploading}>
                  {uploading ? 'Wird gesendet...' : 'Bestätigungsmail senden'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Foto Vollbild Dialog */}
      {selectedPhoto && (
        <Dialog
          open={!!selectedPhoto}
          onOpenChange={() => setSelectedPhoto(null)}
          className='p-0'
        >
          <DialogContent className='max-w-none w-screen h-screen p-0 bg-background/80 backdrop-blur-md duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'>
            <div
              className='relative w-full h-full flex items-center justify-center cursor-pointer'
              onClick={() => setSelectedPhoto(null)}
            >
              <img
                src={selectedPhoto?.image_url}
                alt='Vollbild'
                className='max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-transform duration-300 hover:scale-[1.02]'
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Toaster />
    </div>
  );
}

Gallery.propTypes = {
  supabase: PropTypes.shape({
    from: PropTypes.func.isRequired,
    rpc: PropTypes.func.isRequired,
    functions: PropTypes.shape({
      invoke: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
};

export default Gallery;
